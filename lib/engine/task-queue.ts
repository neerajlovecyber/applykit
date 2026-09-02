/**
 * In-process task queue engine backed by SQLite.
 *
 * Provides a durable task supervisor with retry management,
 * pluggable handler registration, and real-time lifecycle event broadcasting.
 */

import * as dbQueries from "@/lib/db";
import type { Task } from "@/lib/db";

export type TaskHandler = (task: Task, payload: Record<string, unknown>) => Promise<{
  result?: Record<string, unknown>;
  error?: string;
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
let processingInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

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

  return task;
}

/**
 * Process the next pending task.
 */
export async function processNextTask(): Promise<boolean> {
  if (isProcessing) return false;

  const task = dbQueries.getNextPendingTask();
  if (!task) return false;

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
    return true;
  }

  isProcessing = true;

  try {
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

    // Execute handler
    const outcome = await handler(task, payload);

    if (outcome.error) {
      if ((task.attempts ?? 0) + 1 < (task.max_attempts ?? 3)) {
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
    if ((task.attempts ?? 0) + 1 < (task.max_attempts ?? 3)) {
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
  } finally {
    isProcessing = false;
  }

  return true;
}

/**
 * Start the task queue processor.
 */
export function startTaskQueue(pollIntervalMs = 2000): void {
  if (processingInterval) return;

  processingInterval = setInterval(async () => {
    try {
      await processNextTask();
    } catch (err) {
      console.error("[TaskQueue] Processing error:", err);
    }
  }, pollIntervalMs);

  console.log(`[TaskQueue] Started with ${pollIntervalMs}ms poll interval`);
}

/**
 * Stop the task queue processor.
 */
export function stopTaskQueue(): void {
  if (processingInterval) {
    clearInterval(processingInterval);
    processingInterval = null;
    console.log("[TaskQueue] Stopped");
  }
}

/**
 * Check if the task queue is running.
 */
export function isTaskQueueRunning(): boolean {
  return processingInterval !== null;
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
