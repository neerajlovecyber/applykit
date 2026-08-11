import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const attachmentVariants = cva(
  "relative flex items-center gap-3 rounded-xl border p-3 transition-colors text-xs select-none",
  {
    variants: {
      variant: {
        default: "border-border bg-card hover:bg-muted/40",
        ghost: "border-transparent bg-muted/20 hover:bg-muted/40",
        emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
      },
      size: {
        default: "p-3.5 text-xs",
        sm: "p-2.5 text-xs",
        xs: "p-1.5 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface AttachmentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof attachmentVariants> {
  state?: "idle" | "uploading" | "processing" | "done" | "error";
}

export function Attachment({
  className,
  variant,
  size,
  state = "done",
  children,
  ...props
}: AttachmentProps) {
  return (
    <div
      className={cn(
        attachmentVariants({ variant, size }),
        state === "processing" && "animate-pulse border-primary/40",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AttachmentMedia({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-muted/40 text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AttachmentContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)} {...props}>
      {children}
    </div>
  );
}

export function AttachmentTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("truncate font-medium leading-none text-foreground", className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function AttachmentDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-[11px] text-muted-foreground", className)} {...props}>
      {children}
    </p>
  );
}

export function AttachmentActions({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1.5 ml-auto", className)} {...props}>
      {children}
    </div>
  );
}
