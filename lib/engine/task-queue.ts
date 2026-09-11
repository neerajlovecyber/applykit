/**
 * In-process task queue engine backed by SQLite.
 *
 * Provides a durable task supervisor with retry management,
 * pluggable handler registration, and real-time lifecycle event broadcasting.
 */

import * as dbQueries from "@/lib/db";
import type { Task } from "@/lib/db";

export type TaskHandler = (
  task: Task,
  payload: Record<string, unknown>,
  signal?: AbortSignal
) => Promise<{
  result?: Record<string, unknown>;
  error?: string;
  retryable?: boolean;
}>;

export interface TaskEvent {
  taskId: string;
  kind: string;
  status: "queued" | "running" | "succeeded" | "failed";
  result?: Record<string, unknown>;
  error?: string;
  task?: Task;
}

type TaskEventListener = (event: TaskEvent) => void;

const handlers = new Map<string, TaskHandler>();
const eventListeners = new Set<TaskEventListener>();
let isQueueActive = false;
let isProcessing = false;
let passiveHeartbeat: ReturnType<typeof setInterval> | null = null;
let activeTaskController: AbortController | null = null;

/**
 * Register a handler for a specific task kind.
 */
export function registerTaskHandler(kind: string, handler: TaskHandler): void {
  handlers.set(kind, handler);
}

/**
 * Subscribe to task lifecycle events (running, succeeded, failed, queued).
 */
export function onTaskEvent(listener: TaskEventListener): () => void {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

/**
 * Broadcast task event to in-memory listeners and Electron renderer windows.
 */
function broadcastTaskEvent(event: TaskEvent): void {
  for (const listener of eventListeners) {
    try {
      listener(event);
    } catch (err) {
      console.error("[TaskQueue] Error in task event listener:", err);
    }
  }

  // Broadcast to Electron renderer processes
  try {
    const { BrowserWindow } = require("electron");
    if (BrowserWindow && typeof BrowserWindow.getAllWindows === "function") {
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send("tasks:event", event);
        }
      }
    }
  } catch {
    // Non-electron test environment
  }
}

/**
 * Instantly triggers queue processing if not already busy.
 */
export function triggerNextTask(): void {
  if (!isProcessing && isTaskQueueRunning()) {
    setImmediate(() => {
      processNextTask().catch((err) => {
        console.error("[TaskQueue] Error during event pump:", err);
      });
    });
  }
}

/**
 * Enqueue a new task.
 */
export function enqueueTask(data: {
  kind: string;
  payload?: Record<string, unknown>;
  jobId?: string;
  applicationId?: string;
  parentTaskId?: string;
  scheduledFor?: string;
  maxAttempts?: number;
  priority?: number;
}): Task {
  const task = dbQueries.createTask({
    kind: data.kind,
    payload: data.payload ? JSON.stringify(data.payload) : undefined,
    job_id: data.jobId,
    application_id: data.applicationId,
    parent_task_id: data.parentTaskId,
    scheduled_for: data.scheduledFor,
    max_attempts: data.maxAttempts,
    priority: data.priority,
  });

  broadcastTaskEvent({
    taskId: task.id,
    kind: task.kind,
    status: "queued",
    task,
  });

  // Instantly trigger event-driven processing
  triggerNextTask();

  return task;
}

/**
 * Process the next pending task.
 */
export async function processNextTask(): Promise<boolean> {
  if (isProcessing) return false;
  if (!isTaskQueueRunning()) return false;
  isProcessing = true;

  let task: Task | undefined;
  const currentAbortController = new AbortController();
  activeTaskController = currentAbortController;

  try {
    task = dbQueries.getNextPendingTask();
    if (!task) {
      isProcessing = false;
      activeTaskController = null;
      return false;
    }

    const handler = handlers.get(task.kind);
    if (!handler) {
      dbQueries.updateTaskStatus(task.id, "failed", undefined, `No handler registered for task kind: ${task.kind}`);
      broadcastTaskEvent({
        taskId: task.id,
        kind: task.kind,
        status: "failed",
        error: `No handler registered for task kind: ${task.kind}`,
        task,
      });
      isProcessing = false;
      activeTaskController = null;
      return true;
    }

    // Mark as running & broadcast
    dbQueries.updateTaskStatus(task.id, "running");
    broadcastTaskEvent({
      taskId: task.id,
      kind: task.kind,
      status: "running",
      task,
    });

    // Parse payload
    const payload = task.payload ? JSON.parse(task.payload) : {};

    // Execute handler with first-class AbortSignal
    const outcome = await handler(task, payload, currentAbortController.signal);

    if (currentAbortController.signal.aborted) {
      dbQueries.updateTaskStatus(task.id, "failed", undefined, "Cancelled by user");
      broadcastTaskEvent({
        taskId: task.id,
        kind: task.kind,
        status: "failed",
        error: "Cancelled by user",
        task,
      });
      return true;
    }

    if (outcome.error) {
      const isRetryable = outcome.retryable !== false;
      if (isRetryable && (task.attempts ?? 0) + 1 < (task.max_attempts ?? 3)) {
        dbQueries.updateTaskStatus(task.id, "queued", undefined, outcome.error);
        broadcastTaskEvent({
          taskId: task.id,
          kind: task.kind,
          status: "queued",
          error: outcome.error,
          task,
        });
      } else {
        dbQueries.updateTaskStatus(task.id, "failed", undefined, outcome.error);
        broadcastTaskEvent({
          taskId: task.id,
          kind: task.kind,
          status: "failed",
          error: outcome.error,
          task,
        });
      }
    } else {
      dbQueries.updateTaskStatus(
        task.id,
        "succeeded",
        outcome.result ? JSON.stringify(outcome.result) : undefined,
      );
      broadcastTaskEvent({
        taskId: task.id,
        kind: task.kind,
        status: "succeeded",
        result: outcome.result,
        task,
      });
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (task) {
      const wasAborted = currentAbortController.signal.aborted || /cancel/i.test(errorMsg);
      if (wasAborted) {
        dbQueries.updateTaskStatus(task.id, "failed", undefined, "Cancelled by user");
        broadcastTaskEvent({
          taskId: task.id,
          kind: task.kind,
          status: "failed",
          error: "Cancelled by user",
          task,
        });
      } else if ((task.attempts ?? 0) + 1 < (task.max_attempts ?? 3)) {
        dbQueries.updateTaskStatus(task.id, "queued", undefined, errorMsg);
        broadcastTaskEvent({
          taskId: task.id,
          kind: task.kind,
          status: "queued",
          error: errorMsg,
          task,
        });
      } else {
        dbQueries.updateTaskStatus(task.id, "failed", undefined, errorMsg);
        broadcastTaskEvent({
          taskId: task.id,
          kind: task.kind,
          status: "failed",
          error: errorMsg,
          task,
        });
      }
    }
  } finally {
    isProcessing = false;
    if (activeTaskController === currentAbortController) {
      activeTaskController = null;
    }
    // Event-driven: immediately drain next pending task if queue is still running
    if (isTaskQueueRunning()) {
      triggerNextTask();
    }
  }

  return true;
}

/**
 * Start the task queue processor (event-driven with passive fallback heartbeat).
 */
export function startTaskQueue(heartbeatIntervalMs = 5000): void {
  if (isQueueActive) return;
  isQueueActive = true;

  // Passive fallback heartbeat (only to recover stuck or newly scheduled future tasks)
  if (!passiveHeartbeat) {
    passiveHeartbeat = setInterval(async () => {
      try {
        if (isQueueActive && !isProcessing) {
          await processNextTask();
        }
      } catch (err) {
        console.error("[TaskQueue] Heartbeat error:", err);
      }
    }, heartbeatIntervalMs);
  }

  console.log(`[TaskQueue] Started (event-driven with ${heartbeatIntervalMs}ms fallback heartbeat)`);
  triggerNextTask();
}

/**
 * Stop the task queue processor.
 */
export function stopTaskQueue(): void {
  isQueueActive = false;
  if (passiveHeartbeat) {
    clearInterval(passiveHeartbeat);
    passiveHeartbeat = null;
  }
  // Abort running task if any
  if (activeTaskController) {
    activeTaskController.abort("Task queue stopped");
    activeTaskController = null;
  }
  console.log("[TaskQueue] Stopped");
}

/**
 * Pause the task queue processor.
 */
export function pauseTaskQueue(): { success: boolean; isRunning: boolean } {
  isQueueActive = false;
  if (passiveHeartbeat) {
    clearInterval(passiveHeartbeat);
    passiveHeartbeat = null;
  }
  broadcastTaskEvent({
    taskId: "queue",
    kind: "queue_control",
    status: "failed",
    error: "Queue paused",
  });
  return { success: true, isRunning: false };
}

/**
 * Resume the task queue processor.
 */
export function resumeTaskQueue(heartbeatIntervalMs = 5000): { success: boolean; isRunning: boolean } {
  startTaskQueue(heartbeatIntervalMs);
  broadcastTaskEvent({
    taskId: "queue",
    kind: "queue_control",
    status: "queued",
  });
  triggerNextTask();
  return { success: true, isRunning: true };
}

/**
 * Cancel pending queued and running tasks.
 */
export function cancelTasks(kind?: string): { cancelledCount: number } {
  // Abort running task instantly via its AbortController
  if (activeTaskController) {
    activeTaskController.abort("Cancelled by user");
    activeTaskController = null;
  }
  isProcessing = false;

  const cancelled = dbQueries.cancelPendingTasks(kind);
  for (const t of cancelled) {
    broadcastTaskEvent({
      taskId: t.id,
      kind: t.kind,
      status: "failed",
      error: "Cancelled by user",
      task: t as any,
    });
  }

  // Cancel worker active task via worker manager
  try {
    const { workerManager } = require("@/lib/execution/worker-manager");
    workerManager.cancelActiveTask("Cancelled by user");
  } catch {}

  return { cancelledCount: cancelled.length };
}

/**
 * Get current task queue status and stats.
 */
export function getQueueState(): {
  isRunning: boolean;
  isProcessing: boolean;
  stats: ReturnType<typeof dbQueries.getTaskStats>;
} {
  return {
    isRunning: isTaskQueueRunning(),
    isProcessing,
    stats: dbQueries.getTaskStats(),
  };
}

/**
 * Check if the task queue is running.
 */
export function isTaskQueueRunning(): boolean {
  return isQueueActive;
}

/**
 * Get the number of registered handlers.
 */
export function getRegisteredHandlerCount(): number {
  return handlers.size;
}

/**
 * Clear all registered handlers (for testing).
 */
export function clearTaskHandlers(): void {
  handlers.clear();
}
