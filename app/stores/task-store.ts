import { create } from "zustand";
import type { Task } from "@/lib/conveyor/schemas";

interface TaskState {
  tasks: Task[];
  stats: {
    queued: number;
    running: number;
    succeeded: number;
    failed: number;
  };
  isLoading: boolean;
  setTasks: (tasks: Task[]) => void;
  setStats: (stats: TaskState["stats"]) => void;
  setLoading: (loading: boolean) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  stats: { queued: 0, running: 0, succeeded: 0, failed: 0 },
  isLoading: false,
  setTasks: (tasks) => set({ tasks }),
  setStats: (stats) => set({ stats }),
  setLoading: (isLoading) => set({ isLoading }),
}));
