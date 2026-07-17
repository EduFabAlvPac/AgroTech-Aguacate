import { Skeleton } from "@/components/ui/Skeleton";

// ── Alertas loading.tsx ───────────────────────────────────────────────────────
// Shown while AlertasPage fetches the alertas list.
// Mirrors the AlertasClient layout: summary counts + alert list rows.

export default function AlertasLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex flex-col gap-1 px-6 py-4 border-b border-[var(--border-subtle)]">
        <Skeleton variant="text" className="h-5 w-40 rounded-md" />
        <Skeleton variant="text" className="h-3.5 w-72 rounded-full" />
      </div>

      <main className="page-scroll space-y-5">
        {/* Summary count chips */}
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card px-4 py-3 flex items-center gap-2.5">
              <Skeleton variant="text" className="h-3.5 w-3.5 rounded-sm shrink-0" />
              <Skeleton variant="text" className="h-3.5 w-24 rounded-full" />
              <Skeleton variant="text" className="h-5 w-7 rounded-full" />
            </div>
          ))}

          {/* Generate button */}
          <Skeleton variant="text" className="h-10 w-40 rounded-[var(--radius-md)] ml-auto" />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-[var(--border-subtle)]">
          {["w-16", "w-24", "w-20"].map((w, i) => (
            <Skeleton key={i} variant="text" className={`h-8 ${w} rounded-t-[var(--radius-md)]`} />
          ))}
        </div>

        {/* Alert rows */}
        <div className="card overflow-hidden divide-y divide-[var(--border-subtle)]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 animate-pulse">
              {/* Severity icon */}
              <div className="w-8 h-8 rounded-full bg-[var(--border-subtle)] shrink-0 mt-0.5" />

              {/* Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton variant="text" className="h-3.5 w-56 rounded-md" />
                  <Skeleton variant="text" className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton variant="text" className="h-3 w-full rounded-full" />
                <Skeleton variant="text" className="h-3 w-4/5 rounded-full" />
                <Skeleton variant="text" className="h-3 w-24 rounded-full" />
              </div>

              {/* Action button */}
              <Skeleton variant="text" className="h-7 w-7 rounded-[var(--radius-md)] shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
