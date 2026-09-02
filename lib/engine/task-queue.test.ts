import { describe, it, expect, beforeEach } from "bun:test";
import {
  enqueueTask,
  processNextTask,
  registerTaskHandler,
  onTaskEvent,
  clearTaskHandlers,
  type TaskEvent,
} from "./task-queue";
import * as dbQueries from "../db";
import { getDrizzleDb } from "../db";
import { tasks } from "../db/schema";

describe("Unified Task Queue Engine", () => {
  beforeEach(() => {
    clearTaskHandlers();
    getDrizzleDb().delete(tasks).run();
  });

  it("enqueues a task and emits a queued lifecycle event", () => {
    const events: TaskEvent[] = [];
    const unsubscribe = onTaskEvent((e) => events.push(e));

    const task = enqueueTask({
      kind: "test_echo",
      payload: { message: "hello world" },
      priority: 10,
    });

    unsubscribe();

    expect(task.id).toBeDefined();
    expect(task.kind).toBe("test_echo");
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[events.length - 1].status).toBe("queued");
    expect(events[events.length - 1].taskId).toBe(task.id);
  });

  it("processes a registered task and emits running -> succeeded events", async () => {
    let executedPayload: Record<string, unknown> | null = null;
    const events: TaskEvent[] = [];

    registerTaskHandler("test_compute", async (_task, payload) => {
      executedPayload = payload;
      return { result: { sum: (payload.a as number) + (payload.b as number) } };
    });

    const unsubscribe = onTaskEvent((e) => events.push(e));

    const task = enqueueTask({
      kind: "test_compute",
      payload: { a: 15, b: 27 },
    });

    const didProcess = await processNextTask();
    unsubscribe();

    expect(didProcess).toBe(true);
    expect(executedPayload).toEqual({ a: 15, b: 27 });

    const statuses = events.filter((e) => e.taskId === task.id).map((e) => e.status);
    expect(statuses).toContain("queued");
    expect(statuses).toContain("running");
    expect(statuses).toContain("succeeded");

    const updated = dbQueries.getTaskById(task.id);
    expect(updated?.status).toBe("succeeded");
    expect(updated?.result).toBe(JSON.stringify({ sum: 42 }));
  });

  it("handles failure and exhausts retries up to max_attempts", async () => {
    registerTaskHandler("test_fail", async () => {
      return { error: "Permanent connection timeout" };
    });

    const task = enqueueTask({
      kind: "test_fail",
      maxAttempts: 1,
    });

    const didProcess = await processNextTask();
    expect(didProcess).toBe(true);

    const updated = dbQueries.getTaskById(task.id);
    expect(updated?.status).toBe("failed");
    expect(updated?.error).toContain("Permanent connection timeout");
  });

  it("marks task as failed when no handler is registered for kind", async () => {
    const task = enqueueTask({
      kind: "unknown_mystery_task",
    });

    const didProcess = await processNextTask();
    expect(didProcess).toBe(true);

    const updated = dbQueries.getTaskById(task.id);
    expect(updated?.status).toBe("failed");
    expect(updated?.error).toContain("No handler registered for task kind: unknown_mystery_task");
  });
});
