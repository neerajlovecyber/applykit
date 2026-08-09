import React from "react";
import { motion, AnimatePresence, type Transition } from "framer-motion";
import { Zap, Play, Pause, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

function AnimatedText({
  text,
  className,
  delayStep = 0.012,
}: {
  text: string;
  className?: string;
  delayStep?: number;
}) {
  const chars = text.split("");

  return (
    <span className={className} style={{ display: "inline-flex" }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          style={{ display: "inline-flex", willChange: "transform" }}
        >
          {chars.map((char, i) => (
            <motion.span
              key={i}
              initial={{
                y: 6,
                opacity: 0,
                scale: 0.8,
                filter: "blur(2px)",
              }}
              animate={{
                y: 0,
                opacity: 1,
                scale: 1,
                filter: "blur(0px)",
              }}
              exit={{
                y: -6,
                opacity: 0,
                scale: 0.8,
                filter: "blur(2px)",
              }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 18,
                mass: 1,
                delay: i * delayStep,
              }}
              style={{
                display: "inline-block",
                whiteSpace: char === " " ? "pre" : undefined,
              }}
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const spring: Transition = {
  type: "spring",
  stiffness: 280,
  damping: 24,
  mass: 0.8,
};

export interface RunActionButtonProps {
  isRunning: boolean;
  onRun?: () => void;
  onStop?: () => void;
  runLabel?: string;
  runningLabel?: string;
  className?: string;
}

export function RunActionButton({
  isRunning,
  onRun,
  onStop,
  runLabel = "Run Queue",
  runningLabel = "Engine Running",
  className,
}: RunActionButtonProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <motion.div
        animate={{ width: isRunning ? 160 : 130 }}
        transition={spring}
        className={cn(
          "relative flex h-8 items-center overflow-hidden rounded-full border transition-colors shadow-xs",
          isRunning
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
            : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {!isRunning ? (
            <motion.button
              key="idle"
              type="button"
              onClick={onRun}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={spring}
              className="flex flex-1 items-center justify-center gap-1.5 px-3 py-1 text-xs font-semibold cursor-pointer outline-none w-full"
            >
              <Play className="h-3.5 w-3.5 fill-current shrink-0" />
              <AnimatedText text={runLabel} className="font-semibold text-xs text-primary" />
            </motion.button>
          ) : (
            <motion.button
              key="running"
              type="button"
              onClick={onStop}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={spring}
              className="flex flex-1 items-center justify-between gap-1.5 px-3 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 cursor-pointer outline-none w-full"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <AnimatedText text={runningLabel} className="font-semibold text-xs text-emerald-400 truncate" />
              </div>
              <Pause className="h-3.5 w-3.5 fill-current shrink-0 text-rose-400" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
