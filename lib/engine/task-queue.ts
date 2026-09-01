/**
 * In-process task queue engine backed by SQLite.
 *
 * Replaces the need for Redis/Celery (from AutoApply) by using
 * SQLite as a persistent task store with a polling-based processor.
 */

import * as dbQueries from "@/lib/main/db-queries";
import type { Task } from "@/lib/main/db-queries";

export type TaskHandler = (task: Task, payload: Record<string, unknown>) => Promise<{
  result?: Record<string, unknown>;
  error?: string;
}>;

const handlers = new Map<string, TaskHandler>();
let processingInterval: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

/**
 * Register a handler for a specific task kind.
 */
export function registerTaskHandler(kind: string, handler: TaskHandler): void {
  handlers.set(kind, handler);
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
  return dbQueries.createTask({
    kind: data.kind,
    payload: data.payload ? JSON.stringify(data.payload) : undefined,
    job_id: data.jobId,
    application_id: data.applicationId,
    parent_task_id: data.parentTaskId,
    scheduled_for: data.scheduledFor,
    max_attempts: data.maxAttempts,
    priority: data.priority,
  });
}

/**
 * Process the next pending task.
 */
async function processNextTask(): Promise<boolean> {
  if (isProcessing) return false;

  const task = dbQueries.getNextPendingTask();
  if (!task) return false;

  const handler = handlers.get(task.kind);
  if (!handler) {
    dbQueries.updateTaskStatus(task.id, "failed", undefined, `No handler registered for task kind: ${task.kind}`);
    return true;
  }

  isProcessing = true;

  try {
    // Mark as running
    dbQueries.updateTaskStatus(task.id, "running");

    // Parse payload
    const payload = task.payload ? JSON.parse(task.payload) : {};

    // Execute handler
    const outcome = await handler(task, payload);

    if (outcome.error) {
      // Check retry eligibility
      if ((task.attempts ?? 0) + 1 < (task.max_attempts ?? 3)) {
        // Re-queue for retry with exponential backoff
        dbQueries.updateTaskStatus(task.id, "queued", undefined, outcome.error);
        // The task will be picked up again after the backoff period
      } else {
        dbQueries.updateTaskStatus(task.id, "failed", undefined, outcome.error);
      }
    } else {
      dbQueries.updateTaskStatus(
        task.id,
        "succeeded",
        outcome.result ? JSON.stringify(outcome.result) : undefined,
      );
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if ((task.attempts ?? 0) + 1 < (task.max_attempts ?? 3)) {
      dbQueries.updateTaskStatus(task.id, "queued", undefined, errorMsg);
    } else {
      dbQueries.updateTaskStatus(task.id, "failed", undefined, errorMsg);
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
