import { create } from "zustand";
import type { JobPosting } from "@/lib/main/db-queries";

interface JobState {
  jobPostings: JobPosting[];
  selectedJob: JobPosting | null;
  filters: {
    state?: string;
    source?: string;
    minScore?: number;
  };
  isLoading: boolean;
  setJobPostings: (postings: JobPosting[]) => void;
  setSelectedJob: (job: JobPosting | null) => void;
  setFilters: (filters: Partial<JobState["filters"]>) => void;
  setLoading: (loading: boolean) => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobPostings: [],
  selectedJob: null,
  filters: {},
  isLoading: false,
  setJobPostings: (jobPostings) => set({ jobPostings }),
  setSelectedJob: (selectedJob) => set({ selectedJob }),
  setFilters: (newFilters) =>
    set((state) => ({ filters: { ...state.filters, ...newFilters } })),
  setLoading: (isLoading) => set({ isLoading }),
}));
