import { z } from "zod";
import { windowIpcSchema } from "./window-schema";
import { appIpcSchema } from "./app-schema";
import { profileIpcSchema } from "./profile-schema";
import { jobIpcSchema } from "./job-schema";
import { applicationIpcSchema } from "./application-schema";
import { qaIpcSchema } from "./qa-schema";
import { platformIpcSchema } from "./platform-schema";
import { taskIpcSchema } from "./task-schema";
import { settingsIpcSchema } from "./settings-schema";
import { llmIpcSchema } from "./llm-schema";
import { documentIpcSchema } from "./document-schema";
import { automationPlanIpcSchema } from "./automation-plan-schema";

// Define all IPC channel schemas in one place
export const ipcSchemas = {
  ...windowIpcSchema,
  ...appIpcSchema,
  ...profileIpcSchema,
  ...jobIpcSchema,
  ...applicationIpcSchema,
  ...qaIpcSchema,
  ...platformIpcSchema,
  ...taskIpcSchema,
  ...settingsIpcSchema,
  ...llmIpcSchema,
  ...documentIpcSchema,
  ...automationPlanIpcSchema,
} as const;

// Extract types from Zod schemas
export type IPCChannels = {
  [K in keyof typeof ipcSchemas]: {
    args: z.infer<(typeof ipcSchemas)[K]["args"]>;
    return: z.infer<(typeof ipcSchemas)[K]["return"]>;
  };
};

export type ChannelName = keyof typeof ipcSchemas;
export type ChannelArgs<T extends ChannelName> = IPCChannels[T]["args"];
export type ChannelReturn<T extends ChannelName> = IPCChannels[T]["return"];

// Runtime validation helpers
export const validateArgs = <T extends ChannelName>(
  channel: T,
  args: unknown[],
): ChannelArgs<T> => {
  const schema = ipcSchemas[channel];
  if (!schema) {
    throw new Error(`[Conveyor] No schema registered for IPC channel: ${String(channel)}`);
  }
  return schema.args.parse(args) as ChannelArgs<T>;
};

export const validateReturn = <T extends ChannelName>(
  channel: T,
  data: unknown,
): ChannelReturn<T> => {
  const schema = ipcSchemas[channel];
  if (!schema) {
    throw new Error(`[Conveyor] No schema registered for IPC channel: ${String(channel)}`);
  }
  return schema.return.parse(data) as ChannelReturn<T>;
};
