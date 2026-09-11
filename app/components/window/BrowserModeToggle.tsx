import React, { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { cn } from "@/lib/utils";

export const BrowserModeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const conveyor = useConveyor();
  const [mode, setMode] = useState<"visible" | "background">("visible");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchMode = async () => {
      try {
        const saved = await conveyor.data.getSetting("browser_mode");
        if (mounted && saved) {
          setMode(saved === "background" ? "background" : "visible");
        }
      } catch {
        // default to visible
      }
    };
    fetchMode();
    return () => {
      mounted = false;
    };
  }, [conveyor]);

  const toggleMode = async () => {
    const nextMode = mode === "visible" ? "background" : "visible";
    setMode(nextMode);
    setIsSaving(true);
    try {
      await conveyor.data.setSetting("browser_mode", nextMode);
    } finally {
      setTimeout(() => setIsSaving(false), 300);
    }
  };

  const isVisible = mode === "visible";

  return (
    <TooltipProvider delay={200}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 px-2.5 rounded-lg border text-xs font-medium transition-all duration-150 shadow-sm flex items-center gap-1.5",
                isVisible
                  ? "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20"
                  : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                className
              )}
              onClick={toggleMode}
            >
              {isVisible ? (
                <>
                  <Eye className="size-3.5 text-sky-500" />
                  <span className="text-[11px] font-semibold">Browser: Front</span>
                </>
              ) : (
                <>
                  <EyeOff className="size-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-semibold">Browser: Background</span>
                </>
              )}
            </Button>
          }
        />
        <TooltipContent className="px-2.5 py-1 text-[11px] font-medium max-w-[220px]" side="bottom">
          {isVisible
            ? "Mode: Front. Browser window will show in front during auto-apply. Click to switch to Background."
            : "Mode: Background. Browser will run hidden in the background. Click to switch to Front."}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
