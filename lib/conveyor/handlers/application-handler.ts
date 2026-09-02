import { registerJobIpc } from "./job-ipc";

export function registerApplicationHandlers(): void {
  registerJobIpc();
}
