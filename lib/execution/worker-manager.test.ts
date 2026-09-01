import { describe, expect, it } from "bun:test";
import { AutomationWorkerManager } from "./worker-manager";

describe("AutomationWorkerManager Supervisor", () => {
  it("initializes with default worker path", () => {
    const manager = new AutomationWorkerManager();
    expect(manager).toBeDefined();
  });

  it("handles ping health-check command with fallback", async () => {
    const manager = new AutomationWorkerManager();
    const result = await manager.ping();
    expect(result).toBeDefined();
    expect(result.pid).toBeNumber();
    expect(result.uptime).toBeNumber();
  });

  it("handles executeTask dispatch with payload", async () => {
    const manager = new AutomationWorkerManager();
    const result = await manager.executeTask({ taskId: "t-101", action: "apply" });
    expect(result).toBeDefined();
    expect(result.executed).toBe(true);
  });

  it("handles closePool gracefully", async () => {
    const manager = new AutomationWorkerManager();
    await expect(manager.closePool()).resolves.toBeDefined();
  });
});
