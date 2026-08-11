import { describe, expect, it } from "bun:test";
import { computeTokenSimilarity } from "./similarity";

describe("computeTokenSimilarity", () => {
  it("returns high similarity for variations of the same question", () => {
    const q1 = "How many years of experience do you have with Docker?";
    const q2 = "Years of experience with Docker";
    const score = computeTokenSimilarity(q1, q2);
    expect(score).toBeGreaterThanOrEqual(0.65);
  });

  it("returns low similarity for completely different questions", () => {
    const q1 = "Years of experience with Docker";
    const q2 = "What is your notice period in days?";
    const score = computeTokenSimilarity(q1, q2);
    expect(score).toBeLessThan(0.3);
  });

  it("handles empty or undefined inputs gracefully", () => {
    expect(computeTokenSimilarity("", "Docker")).toBe(0);
    expect(computeTokenSimilarity("Docker", "")).toBe(0);
  });
});
