import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DashboardPage } from "@/app/pages/DashboardPage";
import { AutoApplyPage } from "@/app/pages/AutoApplyPage";
import { JobQueuePage } from "@/app/pages/JobQueuePage";
import { RoleProfilesPage } from "@/app/pages/RoleProfilesPage";
import { DocumentsPage } from "@/app/pages/DocumentsPage";
import { QABankPage } from "@/app/pages/QABankPage";
import { HistoryPage } from "@/app/pages/HistoryPage";
import { SettingsPage } from "@/app/pages/SettingsPage";

const PAGE_MAP: Record<string, React.ComponentType> = {
  "/dashboard": DashboardPage,
  "/auto-apply": AutoApplyPage,
  "/queue": JobQueuePage,
  "/profiles": RoleProfilesPage,
  "/documents": DocumentsPage,
  "/qabank": QABankPage,
  "/history": HistoryPage,
  "/settings": SettingsPage,
};

export const KeepAlivePages: React.FC = () => {
  const location = useLocation();
  const rawPath = location.pathname;
  const currentPath =
    rawPath === "/" || rawPath === "/naukri" || rawPath === "/finder"
      ? "/auto-apply"
      : PAGE_MAP[rawPath]
      ? rawPath
      : "/dashboard";

  // Keep track of mounted pages so we lazily mount them on first visit
  const [visitedPaths, setVisitedPaths] = useState<Set<string>>(new Set([currentPath]));

  useEffect(() => {
    if (PAGE_MAP[currentPath] && !visitedPaths.has(currentPath)) {
      setVisitedPaths((prev) => new Set([...prev, currentPath]));
    }
  }, [currentPath]);

  return (
    <div className="relative w-full h-full min-h-full">
      {Object.entries(PAGE_MAP).map(([path, PageComponent]) => {
        if (!visitedPaths.has(path)) return null;

        const isActive = currentPath === path;

        return (
          <div
            key={path}
            style={{ display: isActive ? "block" : "none" }}
            className={isActive ? "block w-full min-h-full" : "hidden"}
          >
            <PageComponent />
          </div>
        );
      })}
    </div>
  );
};
