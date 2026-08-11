import * as React from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Trash2, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";

export interface FileDropzoneProps {
  onFileSelect?: (file?: File) => void;
  onBrowseClick?: () => void;
  accept?: string;
  maxSizeMB?: number;
  fileName?: string | null;
  fileSizeKB?: number | null;
  isProcessing?: boolean;
  statusText?: string;
  onRemove?: () => void;
  className?: string;
}

export function FileDropzone({
  onFileSelect,
  onBrowseClick,
  accept = ".pdf",
  maxSizeMB = 25,
  fileName,
  fileSizeKB,
  isProcessing = false,
  statusText,
  onRemove,
  className,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const dragCounter = React.useRef(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect?.(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect?.(e.target.files[0]);
    }
  };

  const handleClick = () => {
    if (onBrowseClick) {
      onBrowseClick();
    } else {
      inputRef.current?.click();
    }
  };

  return (
    <div className={cn("flex flex-col gap-3 w-full", className)}>
      {/* File Dropzone Area */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-5 transition-all duration-200 cursor-pointer select-none",
          isDragging
            ? "border-primary bg-primary/10 scale-[0.99]"
            : "border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-muted/40",
          isProcessing && "opacity-80 pointer-events-none"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInputChange}
        />

        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl border transition-colors",
            isDragging
              ? "border-primary/40 bg-primary/20 text-primary"
              : "border-border bg-card text-muted-foreground shadow-sm"
          )}
        >
          <UploadCloud className="h-5 w-5 text-primary" />
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs font-semibold text-foreground">
            {isDragging ? "Drop your resume PDF here" : "Drag & drop your resume PDF or click to browse"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Supports PDF files up to {maxSizeMB}MB
          </p>
        </div>
      </div>

      {/* Selected File Card / Attachment Preview */}
      {fileName && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
              <FileCheck className="h-4 w-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground truncate">{fileName}</span>
              <span className="text-[11px] text-muted-foreground">
                {fileSizeKB ? `${fileSizeKB} KB` : "Base Resume Attached"} {statusText ? `• ${statusText}` : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 font-mono">
              Ready
            </Badge>
            {onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
