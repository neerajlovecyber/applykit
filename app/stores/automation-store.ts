import { create } from "zustand";
import type { AutomationPlan, SearchQuery } from "@/lib/main/db-queries";

interface AutomationState {
  plans: AutomationPlan[];
  searchQueries: SearchQuery[];
  isLoading: boolean;
  setPlans: (plans: AutomationPlan[]) => void;
  setSearchQueries: (searchQueries: SearchQuery[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useAutomationStore = create<AutomationState>((set) => ({
  plans: [],
  searchQueries: [],
  isLoading: false,
  setPlans: (plans) => set({ plans }),
  setSearchQueries: (searchQueries) => set({ searchQueries }),
  setLoading: (isLoading) => set({ isLoading }),
}));
