import { electronAPI } from "@electron-toolkit/preload";
import { AppApi } from "./app-api";
import { WindowApi } from "./window-api";
import { DataApi } from "./data-api";

export const conveyor = {
  app: new AppApi(electronAPI),
  window: new WindowApi(electronAPI),
  data: new DataApi(electronAPI),
};

export type ConveyorApi = typeof conveyor;
