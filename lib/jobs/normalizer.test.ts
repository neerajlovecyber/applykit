import { describe, expect, it } from "bun:test";
import { normalizeRawJob } from "./normalizer";
import type { RawJobPosting } from "./types";

describe("normalizeRawJob", () => {
  it("cleans HTML tags and whitespace from titles, companies, and descriptions", () => {
    const raw: RawJobPosting = {
      source: "LinkedIn",
      sourceId: "12345",
      title: "<h1>Senior DevOps Engineer</h1>",
      company: "  Acme Corp  ",
      description: "<p>We are looking for a <b>DevOps Specialist</b>.</p>",
      location: "  New York, NY  ",
    };

    const normalized = normalizeRawJob(raw);

    expect(normalized.source).toBe("linkedin");
    expect(normalized.source_id).toBe("12345");
    expect(normalized.title).toBe("Senior DevOps Engineer");
    expect(normalized.company).toBe("Acme Corp");
    expect(normalized.description).toBe("We are looking for a DevOps Specialist.");
    expect(normalized.location).toBe("New York, NY");
    expect(normalized.content_hash).toBeDefined();
    expect(typeof normalized.content_hash).toBe("string");
  });

  it("decodes HTML entities into human-readable characters", () => {
    const raw: RawJobPosting = {
      source: "LinkedIn",
      sourceId: "456",
      title: "R&amp;D Software Engineer",
      company: "Ben &amp; Jerry&#39;s",
      description: "&quot;Top-tier&quot; engineering &amp; cloud infrastructure&nbsp;&gt;&nbsp;scale.",
    };

    const normalized = normalizeRawJob(raw);
    expect(normalized.title).toBe("R&D Software Engineer");
    expect(normalized.company).toBe("Ben & Jerry's");
    expect(normalized.description).toBe('"Top-tier" engineering & cloud infrastructure > scale.');
  });
});
