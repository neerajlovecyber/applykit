import { handle } from "@/lib/main/shared";
import * as dbQueries from "@/lib/main/db-queries";

export function registerSettingsHandlers(): void {
  handle("settings:get-all", () => dbQueries.getAllSettings());
  handle("settings:get", (key) => dbQueries.getSetting(key));
  handle("settings:set", ({ key, value }) => dbQueries.setSetting(key, value));
}
