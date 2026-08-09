"use client";

import React, { useState, useEffect, type FC } from "react";
import { motion, LayoutGroup } from "framer-motion";

export interface TabItem {
  id: string;
  label: React.ReactNode;
}

export interface ContinuousTabsProps {
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  className?: string;
}

const DEFAULT_TABS: TabItem[] = [
  { id: "home", label: "Home" },
  { id: "interactions", label: "Interactions" },
  { id: "resources", label: "Resources" },
  { id: "docs", label: "Docs" },
];

export const ContinuousTabs: FC<ContinuousTabsProps> = ({
  tabs = DEFAULT_TABS,
  value,
  defaultValue = tabs[0]?.id || "home",
  onValueChange,
  className = "",
}) => {
  const [internalActive, setInternalActive] = useState<string>(defaultValue);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  const active = value !== undefined ? value : internalActive;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChange = (id: string) => {
    setInternalActive(id);
    onValueChange?.(id);
  };

  if (!isMounted) return null;

  return (
    <LayoutGroup>
      <nav
        className={`relative inline-flex items-center gap-0.5 sm:gap-1 p-1 rounded-full border border-border/60 bg-muted/30 backdrop-blur-md shadow-xs transition-all duration-300 ${className}`}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleChange(tab.id)}
              className="relative px-3.5 py-1.5 rounded-full outline-none cursor-pointer flex items-center justify-center"
            >
              {/* Active pill */}
              {isActive && (
                <motion.div
                  layoutId="continuous-active-pill"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                    mass: 0.9,
                  }}
                  className="absolute inset-0 rounded-full bg-secondary border border-border/50 shadow-xs"
                />
              )}

              {/* Text / Label */}
              <motion.span
                layout="position"
                className={`relative z-10 text-xs font-semibold transition-colors duration-200 flex items-center gap-2 ${
                  isActive
                    ? "text-secondary-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </motion.span>
            </button>
          );
        })}
      </nav>
    </LayoutGroup>
  );
};
