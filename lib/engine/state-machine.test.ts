import { describe, expect, it } from "bun:test";
import {
  canTransitionJob,
  canTransitionApplication,
  assertJobTransition,
  createStateHistoryEntry,
} from "./state-machine";

describe("state-machine", () => {
  it("allows valid job state transitions", () => {
    expect(canTransitionJob("new", "scored")).toBe(true);
    expect(canTransitionJob("approved", "applying")).toBe(true);
    expect(canTransitionJob("applying", "needs_human_action")).toBe(true);
    expect(canTransitionJob("needs_human_action", "applying")).toBe(true);
    expect(canTransitionJob("needs_human_action", "applied")).toBe(true);
  });

  it("rejects invalid job state transitions", () => {
    expect(canTransitionJob("new", "applied")).toBe(false);
    expect(canTransitionJob("applied", "new")).toBe(false);
    expect(() => assertJobTransition("new", "applied")).toThrow();
  });

  it("allows valid application status transitions", () => {
    expect(canTransitionApplication("approved", "applying")).toBe(true);
    expect(canTransitionApplication("applying", "needs_human_action")).toBe(true);
    expect(canTransitionApplication("needs_human_action", "submitted")).toBe(true);
  });

  it("creates valid state history entries", () => {
    const entry = createStateHistoryEntry("approved", "applying", "Started runner");
    expect(entry.from).toBe("approved");
    expect(entry.to).toBe("applying");
    expect(entry.reason).toBe("Started runner");
    expect(entry.at).toBeDefined();
  });
});
