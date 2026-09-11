import { create } from "zustand";

interface QueueState {
  isRunning: boolean;
  currentJobId: string | null;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  setIsRunning: (isRunning: boolean) => void;
  setPendingCount: (count: number) => void;
  startQueue: () => Promise<void>;
  pauseQueue: () => Promise<void>;
  stopQueue: () => Promise<void>;
  setStats: (stats: { pending: number; running: number; done: number; failed: number }) => void;
}

export const useQueueStore = create<QueueState>((set) => ({
  isRunning: false,
  currentJobId: null,
  pendingCount: 0,
  completedCount: 0,
  failedCount: 0,
  setIsRunning: (isRunning) => set({ isRunning }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  startQueue: async () => {
    set({ isRunning: true });
    try {
      await (window as any).conveyor?.data?.resumeTaskQueue?.();
    } catch (e) {
      console.error("[QueueStore] Error starting queue:", e);
    }
  },
  pauseQueue: async () => {
    set({ isRunning: false, currentJobId: null });
    try {
      await (window as any).conveyor?.data?.pauseTaskQueue?.();
    } catch (e) {
      console.error("[QueueStore] Error pausing queue:", e);
    }
  },
  stopQueue: async () => {
    set({ isRunning: false, currentJobId: null, pendingCount: 0 });
    try {
      await (window as any).conveyor?.data?.stopTaskQueue?.();
    } catch (e) {
      console.error("[QueueStore] Error stopping queue:", e);
    }
  },
  setStats: (stats) =>
    set({
      pendingCount: stats.pending,
      completedCount: stats.done,
      failedCount: stats.failed,
    }),
}));
