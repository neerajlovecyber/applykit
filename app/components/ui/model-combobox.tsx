import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  id: string;
  label?: string;
  name?: string;
  isFree?: boolean;
}

interface ModelComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ModelCombobox: React.FC<ModelComboboxProps> = ({
  options = [],
  value,
  onChange,
  placeholder = "Select or search model...",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const safeOptions = Array.isArray(options) ? options : [];

  const getOptionLabel = (opt: ComboboxOption) => {
    if (!opt) return "";
    return opt.label || opt.name || opt.id || "";
  };

  const filteredOptions = safeOptions.filter((opt) => {
    if (!opt) return false;
    const labelStr = getOptionLabel(opt).toLowerCase();
    const idStr = (opt.id || "").toLowerCase();
    const query = (searchTerm || "").toLowerCase().trim();
    return labelStr.includes(query) || idStr.includes(query);
  });

  const selectedOption = safeOptions.find((opt) => opt && opt.id === value);
  const displayLabel = selectedOption ? getOptionLabel(selectedOption) : value || placeholder;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary flex items-center justify-between font-medium text-foreground",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md animate-in fade-in-80 zoom-in-95">
          <div className="p-2 border-b border-border/50 flex items-center gap-2 bg-muted/20">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search model name or ID..."
              className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>

          <div className="max-h-52 overflow-y-auto p-1 space-y-0.5 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="py-2.5 text-center text-xs text-muted-foreground">
                No matching models found.
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.id === value;
                const optLabel = getOptionLabel(option);

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onChange(option.id);
                      setOpen(false);
                      setSearchTerm("");
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-accent hover:text-accent-foreground text-foreground"
                    )}
                  >
                    <span className="truncate">{optLabel}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })
            )}

            {/* Custom option */}
            <button
              type="button"
              onClick={() => {
                onChange("custom");
                setOpen(false);
                setSearchTerm("");
              }}
              className="w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center gap-2 transition-colors border-t border-border/40 mt-1 text-primary hover:bg-primary/5 font-medium"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span>Use Custom Model ID...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
