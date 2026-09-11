import React, { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { cn } from "@/lib/utils";

export const BrowserFocusButton: React.FC<{ className?: string }> = ({ className }) => {
  const conveyor = useConveyor();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        const res = await conveyor.data.getBrowserStatus();
        if (mounted && res) {
          setIsOpen(Boolean(res.open));
        }
      } catch {
        // ignore
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2500);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [conveyor]);

  const handleBringToFront = async () => {
    setIsFocusing(true);
    try {
      const res = await conveyor.data.bringBrowserToFront();
      if (!res?.success) {
        await conveyor.data.launchNaukriBrowser().catch(() => {});
      }
    } finally {
      setTimeout(() => setIsFocusing(false), 600);
    }
  };

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
                isOpen
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-emerald-500/10"
                  : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                className
              )}
              onClick={handleBringToFront}
            >
              <span className="relative flex h-2 w-2">
                {isOpen && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    isOpen ? "bg-emerald-500" : "bg-muted-foreground/40"
                  )}
                />
              </span>
              <Globe className={cn("size-3.5", isFocusing && "animate-spin")} />
              <span className="text-[11px] font-semibold">
                {isOpen ? "Browser (Live)" : "Show Browser"}
              </span>
            </Button>
          }
        />
        <TooltipContent className="px-2.5 py-1 text-[11px] font-medium" side="bottom">
          {isOpen
            ? "Automation browser is open. Click to bring to front!"
            : "Click to show/launch automation browser window"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
