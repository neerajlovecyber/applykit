import { registerTaskIpc } from "./task-ipc";
import { registerJobIpc } from "./job-ipc";

export function registerTaskHandlers(): void {
  registerTaskIpc();
  registerJobIpc();
}
