import { create } from "zustand";

interface QueueState {
  isRunning: boolean;
  currentJobId: string | null;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  startQueue: () => void;
  pauseQueue: () => void;
  setStats: (stats: { pending: number; running: number; done: number; failed: number }) => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  isRunning: false,
  currentJobId: null,
  pendingCount: 0,
  completedCount: 0,
  failedCount: 0,
  startQueue: () => set({ isRunning: true }),
  pauseQueue: () => set({ isRunning: false, currentJobId: null }),
  setStats: (stats) =>
    set({
      pendingCount: stats.pending,
      completedCount: stats.done,
      failedCount: stats.failed,
    }),
}));
