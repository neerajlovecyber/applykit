import { describe, expect, it } from "bun:test";
import {
  ipcSchemas,
  validateArgs,
  validateReturn,
} from "./schemas";
import { DataApi } from "./api/data-api";

describe("Conveyor IPC System", () => {
  describe("Schema Registry Coverage", () => {
    it("has schemas registered for core domain channels", () => {
      const coreChannels = [
        "profiles:get",
        "profiles:get-active",
        "profiles:create",
        "profiles:update",
        "job-postings:get",
        "job-postings:update-score",
        "job-postings:update-state",
        "applications:get",
        "applications:update-status",
        "qa-bank:get",
        "qa-bank:find-answer",
        "settings:get",
        "settings:set",
        "tasks:get",
        "tasks:create",
        "llm:list-providers",
        "llm:score-job",
        "documents:get",
        "automation-plans:get",
      ];

      for (const channel of coreChannels) {
        expect(ipcSchemas).toHaveProperty(channel);
        expect(ipcSchemas[channel as keyof typeof ipcSchemas]).toBeDefined();
        expect(ipcSchemas[channel as keyof typeof ipcSchemas].args).toBeDefined();
        expect(ipcSchemas[channel as keyof typeof ipcSchemas].return).toBeDefined();
      }
    });
  });

  describe("Runtime Argument Validation (validateArgs)", () => {
    it("accepts valid arguments for profile update", () => {
      const args = [{ id: "prof_123", data: { full_name: "Jane Doe" } }];
      const validated = validateArgs("profiles:update", args);
      expect(validated[0].id).toBe("prof_123");
      expect(validated[0].data.full_name).toBe("Jane Doe");
    });

    it("rejects invalid arguments for profile update (missing id)", () => {
      const invalidArgs = [{ data: { full_name: "Jane Doe" } }];
      expect(() => validateArgs("profiles:update", invalidArgs)).toThrow();
    });

    it("accepts valid arguments for job score update", () => {
      const args = [{ id: "job_456", score: 85, explanation: "Great match" }];
      const validated = validateArgs("job-postings:update-score", args);
      expect(validated[0].score).toBe(85);
      expect(validated[0].explanation).toBe("Great match");
    });

    it("rejects non-numeric score in job score update", () => {
      const invalidArgs = [{ id: "job_456", score: "eighty-five" }];
      expect(() => validateArgs("job-postings:update-score", invalidArgs as any)).toThrow();
    });

    it("validates settings key-value object correctly", () => {
      const args = [{ key: "theme", value: "dark" }];
      const validated = validateArgs("settings:set", args);
      expect(validated[0].key).toBe("theme");
      expect(validated[0].value).toBe("dark");
    });

    it("rejects settings:set if value is missing", () => {
      const invalidArgs = [{ key: "theme" }];
      expect(() => validateArgs("settings:set", invalidArgs as any)).toThrow();
    });

    it("validates application status update", () => {
      const args = [{ id: "app_789", status: "applied", errorMessage: undefined }];
      const validated = validateArgs("applications:update-status", args);
      expect(validated[0].status).toBe("applied");
    });

    it("throws clear error for unknown channel", () => {
      expect(() => validateArgs("unknown:non-existent" as any, [])).toThrow(
        "[Conveyor] No schema registered for IPC channel: unknown:non-existent",
      );
    });
  });

  describe("Runtime Return Validation (validateReturn)", () => {
    it("validates version string return", () => {
      const result = validateReturn("app:get-version", "0.1.0");
      expect(result).toBe("0.1.0");
    });

    it("validates settings map return", () => {
      const settingsMap = { theme: "dark", auto_apply: "true" };
      const result = validateReturn("settings:get-all", settingsMap);
      expect(result).toEqual(settingsMap);
    });

    it("validates connection boolean return", () => {
      const result = validateReturn("linkedin:is-connected", { connected: true });
      expect(result.connected).toBe(true);
    });
  });

  describe("DataApi Client Contract", () => {
    it("correctly routes method calls through ipcRenderer.invoke", async () => {
      const calls: { channel: string; args: any[] }[] = [];
      const mockElectronApi: any = {
        ipcRenderer: {
          invoke: async (channel: string, ...args: any[]) => {
            calls.push({ channel, args });
            if (channel === "profiles:get") return [];
            if (channel === "settings:get") return "dark";
            return { success: true };
          },
        },
      };

      const dataApi = new DataApi(mockElectronApi);

      // Call profiles
      await dataApi.getProfiles();
      expect(calls[0].channel).toBe("profiles:get");

      // Call settings
      await dataApi.getSetting("theme");
      expect(calls[1].channel).toBe("settings:get");
      expect(calls[1].args[0]).toBe("theme");

      // Call job postings
      await dataApi.updateJobPostingScore("job_1", 90);
      expect(calls[2].channel).toBe("job-postings:update-score");
      expect(calls[2].args[0].score).toBe(90);
    });
  });
});
