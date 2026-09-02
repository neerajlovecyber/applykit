import { create } from "zustand";
import type { Profile } from "@/lib/conveyor/schemas";

interface ProfileState {
  activeProfile: Profile | null;
  profiles: Profile[];
  setActiveProfile: (profile: Profile) => void;
  setProfiles: (profiles: Profile[]) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  activeProfile: null,
  profiles: [],
  setActiveProfile: (profile) => set({ activeProfile: profile }),
  setProfiles: (profiles) => set({ profiles }),
}));
