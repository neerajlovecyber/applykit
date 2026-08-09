import { create } from "zustand";

export interface RunResult {
  jobId?: string;
  title: string;
  company: string;
  location?: string;
  status: string;
  success: boolean;
  fieldsFilled?: number;
  errorMessage?: string;
}

export interface RunStats {
  processed: number;
  applied?: number;
  skipped?: number;
  failed?: number;
}

export interface ActiveExecutionState {
  isRunning: boolean;
  platform: "linkedin" | "naukri" | "search";
  statusMsg: string | null;
  statusType: "info" | "success" | "error";
  logResults: RunResult[];
  runStats: RunStats | null;
  startedAt: string | null;

  startExecution: (platform: "linkedin" | "naukri" | "search", statusMsg: string) => void;
  updateStatus: (msg: string, type?: "info" | "success" | "error") => void;
  setResults: (results: RunResult[], stats?: RunStats | null) => void;
  finishExecution: (success: boolean, msg: string, stats?: RunStats | null, results?: RunResult[]) => void;
  resetExecution: () => void;
}

export const useExecutionStore = create<ActiveExecutionState>((set) => ({
  isRunning: false,
  platform: "linkedin",
  statusMsg: null,
  statusType: "info",
  logResults: [],
  runStats: null,
  startedAt: null,

  startExecution: (platform, statusMsg) =>
    set({
      isRunning: true,
      platform,
      statusMsg,
      statusType: "info",
      logResults: [],
      runStats: null,
      startedAt: new Date().toISOString(),
    }),

  updateStatus: (statusMsg, statusType = "info") =>
    set({ statusMsg, statusType }),

  setResults: (logResults, runStats = null) =>
    set({ logResults, runStats }),

  finishExecution: (success, statusMsg, runStats = null, logResults) =>
    set((state) => ({
      isRunning: false,
      statusType: success ? "success" : "error",
      statusMsg,
      runStats: runStats ?? state.runStats,
      logResults: logResults ?? state.logResults,
    })),

  resetExecution: () =>
    set({
      isRunning: false,
      statusMsg: null,
      statusType: "info",
      logResults: [],
      runStats: null,
      startedAt: null,
    }),
}));
