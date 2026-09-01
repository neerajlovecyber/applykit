import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/main/db-queries";

export function registerProfileHandlers(): void {
  handle("profiles:get", () => dbQueries.getProfiles());
  handle("profiles:get-active", () => dbQueries.getActiveProfile());
  handle("profiles:get-by-id", (id) => dbQueries.getProfileById(id));
  handle("profiles:create", (data) => dbQueries.createProfile(data));
  handle("profiles:update", ({ id, data }) => dbQueries.updateProfile(id, data));
  handle("profiles:set-active", (id) => dbQueries.setActiveProfile(id));
  handle("profiles:delete", (id) => dbQueries.deleteProfile(id));
}
