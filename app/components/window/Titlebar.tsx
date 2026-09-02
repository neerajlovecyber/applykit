import { useEffect } from "react";
import { Minus, Square, X } from "lucide-react";
import { useWindowContext } from "./WindowContext";
import { useTitlebarContext } from "./TitlebarContext";
import { TitlebarMenu } from "./TitlebarMenu";
import { useConveyor } from "@/app/hooks/use-conveyor";
import { Button } from "@/app/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";

export const Titlebar = () => {
  const { menuItems } = useWindowContext().titlebar;
  const { menusVisible, setMenusVisible, closeActiveMenu } = useTitlebarContext();
  const { window: wcontext } = useWindowContext();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && menuItems?.length && !e.repeat) {
        if (menusVisible) closeActiveMenu();
        setMenusVisible(!menusVisible);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menusVisible, closeActiveMenu, setMenusVisible, menuItems]);

  return (
    <div className={`window-titlebar ${wcontext?.platform ? `platform-${wcontext.platform}` : ""}`}>
      {menusVisible && <TitlebarMenu />}
      {wcontext?.platform === "win32" && <TitlebarControls />}
    </div>
  );
};

const TitlebarControls = () => {
  const { window: wcontext } = useWindowContext();

  return (
    <TooltipProvider delay={300}>
      <div className="window-titlebar-controls flex items-center gap-1.5 px-3 py-1.5">
        {wcontext?.minimizable && (
          <TitlebarIconButton label="Minimize" icon={<Minus className="size-3.5" />} action="minimize" variant="minimize" />
        )}
        {wcontext?.maximizable && (
          <TitlebarIconButton label="Maximize" icon={<Square className="size-3" />} action="maximize" variant="maximize" />
        )}
        <TitlebarIconButton label="Close" icon={<X className="size-3.5" />} action="close" variant="close" />
      </div>
    </TooltipProvider>
  );
};

const variantStyles: Record<string, string> = {
  minimize: "bg-amber-400 text-amber-900 border-amber-400 hover:bg-amber-300 hover:border-amber-300",
  maximize: "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-400 hover:border-emerald-400",
  close:    "bg-rose-500 text-white border-rose-500 hover:bg-rose-400 hover:border-rose-400",
};

const TitlebarIconButton = ({
  label,
  icon,
  action,
  variant = "minimize",
}: {
  label: string;
  icon: React.ReactNode;
  action: "minimize" | "maximize" | "close";
  variant?: "minimize" | "maximize" | "close";
}) => {
  const { windowMinimize, windowMaximizeToggle, windowClose } = useConveyor("window");

  const handleAction = () => {
    const actions = {
      minimize: windowMinimize,
      maximize: windowMaximizeToggle,
      close: windowClose,
    };
    actions[action]?.();
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className={`size-7 rounded-lg border transition-all duration-150 shadow-sm ${variantStyles[variant]}`}
            onClick={handleAction}
          >
            {icon}
            <span className="sr-only">{label}</span>
          </Button>
        }
      />
      <TooltipContent className="px-2 py-1 text-[11px] font-medium" side="bottom">
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

export interface TitlebarProps {
  title: string;
  titleCentered?: boolean;
  icon?: string;
  menuItems?: TitlebarMenu[];
}
