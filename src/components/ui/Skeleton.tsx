import { cn } from "@/lib/utils";

// ── Skeleton ──────────────────────────────────────────────────────────────────

type SkeletonVariant = "text" | "card" | "table-row" | "avatar";

interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
}

const base = "animate-pulse bg-[var(--border-subtle)] rounded-[var(--radius-md)]";

export function Skeleton({ variant = "text", className }: SkeletonProps) {
  switch (variant) {
    case "text":
      return (
        <div
          className={cn(base, "h-4 w-full rounded-full", className)}
          role="status"
          aria-label="Cargando..."
        />
      );

    case "card":
      return (
        <div
          className={cn(
            "animate-pulse rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 space-y-3",
            className
          )}
          role="status"
          aria-label="Cargando..."
        >
          {/* Header row */}
          <div className="flex items-center gap-3">
            <div className={cn(base, "w-9 h-9 rounded-[var(--radius-md)] shrink-0")} />
            <div className="flex-1 space-y-1.5">
              <div className={cn(base, "h-3.5 w-2/3 rounded-full")} />
              <div className={cn(base, "h-3 w-1/3 rounded-full")} />
            </div>
          </div>
          {/* Content lines */}
          <div className={cn(base, "h-3 w-full rounded-full")} />
          <div className={cn(base, "h-3 w-5/6 rounded-full")} />
          {/* Footer */}
          <div className="flex gap-2 pt-1">
            <div className={cn(base, "h-6 w-16 rounded-full")} />
            <div className={cn(base, "h-6 w-20 rounded-full")} />
          </div>
        </div>
      );

    case "table-row":
      return (
        <div
          className={cn(
            "animate-pulse flex items-center gap-4 px-4 py-3 border-b border-[var(--border-subtle)]",
            className
          )}
          role="status"
          aria-label="Cargando..."
        >
          <div className={cn(base, "h-3.5 w-1/4 rounded-full")} />
          <div className={cn(base, "h-3.5 w-1/3 rounded-full")} />
          <div className={cn(base, "h-3.5 w-1/5 rounded-full")} />
          <div className="flex-1" />
          <div className={cn(base, "h-6 w-14 rounded-full")} />
        </div>
      );

    case "avatar":
      return (
        <div
          className={cn(base, "w-10 h-10 rounded-full shrink-0", className)}
          role="status"
          aria-label="Cargando..."
        />
      );
  }
}
