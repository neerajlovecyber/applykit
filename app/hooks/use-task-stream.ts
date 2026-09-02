import { useEffect, useState, useCallback, useRef } from "react";
import { useConveyor } from "./use-conveyor";

export interface TaskStreamEvent {
  taskId: string;
  kind: string;
  status: "queued" | "running" | "succeeded" | "failed";
  result?: Record<string, any>;
  error?: string;
  task?: any;
  timestamp: number;
}

export interface UseTaskStreamOptions {
  kinds?: string[];
  onEvent?: (event: TaskStreamEvent) => void;
  maxEvents?: number;
}

/**
 * React Hook for real-time task lifecycle streaming over Conveyor IPC.
 * Eliminates polling by subscribing directly to tasks:event broadcasts.
 */
export function useTaskStream(options: UseTaskStreamOptions = {}) {
  const conveyor = useConveyor();
  const [events, setEvents] = useState<TaskStreamEvent[]>([]);
  const [latestEvent, setLatestEvent] = useState<TaskStreamEvent | null>(null);
  const [activeTasks, setActiveTasks] = useState<Map<string, TaskStreamEvent>>(new Map());

  const onEventRef = useRef(options.onEvent);
  onEventRef.current = options.onEvent;

  const kindsKey = options.kinds?.join(",") || "";

  useEffect(() => {
    if (!conveyor?.data?.onTaskEvent) return;

    const unsubscribe = conveyor.data.onTaskEvent((rawEvent) => {
      if (options.kinds?.length && !options.kinds.includes(rawEvent.kind)) {
        return;
      }

      const streamEvent: TaskStreamEvent = {
        ...rawEvent,
        timestamp: Date.now(),
      };

      setLatestEvent(streamEvent);
      setEvents((prev) => [streamEvent, ...prev].slice(0, options.maxEvents || 50));

      setActiveTasks((prev) => {
        const next = new Map(prev);
        if (streamEvent.status === "running") {
          next.set(streamEvent.taskId, streamEvent);
        } else if (streamEvent.status === "succeeded" || streamEvent.status === "failed") {
          next.delete(streamEvent.taskId);
        }
        return next;
      });

      if (onEventRef.current) {
        onEventRef.current(streamEvent);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conveyor, kindsKey]);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLatestEvent(null);
  }, []);

  return {
    latestEvent,
    events,
    activeTasks: Array.from(activeTasks.values()),
    activeCount: activeTasks.size,
    clearEvents,
  };
}
