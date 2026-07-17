import { Skeleton } from "@/components/ui/Skeleton";

// ── Cultivo Detail loading.tsx ────────────────────────────────────────────────
// Shown while CultivoDetailPage fetches the cultivo with its registros, gastos,
// and ingresos. Mirrors the CultivoDetail layout: info panel + tabs + table.

export default function CultivoDetailLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex flex-col gap-1 px-6 py-4 border-b border-[var(--border-subtle)]">
        <Skeleton variant="text" className="h-5 w-48 rounded-md" />
        <Skeleton variant="text" className="h-3.5 w-40 rounded-full" />
      </div>

      <main className="page-scroll space-y-6">
        {/* Top info card */}
        <div className="card p-5 space-y-4">
          {/* Stage badge + title row */}
          <div className="flex items-center gap-3">
            <Skeleton variant="text" className="h-6 w-28 rounded-full" />
            <Skeleton variant="text" className="h-4 w-36 rounded-md" />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton variant="text" className="h-6 w-20 rounded-md" />
                <Skeleton variant="text" className="h-3 w-24 rounded-full" />
              </div>
            ))}
          </div>

          {/* Description line */}
          <div className="space-y-1.5">
            <Skeleton variant="text" className="h-3 w-full rounded-full" />
            <Skeleton variant="text" className="h-3 w-5/6 rounded-full" />
          </div>
        </div>

        {/* Tabs row */}
        <div className="flex gap-1 border-b border-[var(--border-subtle)]">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="text"
              className={`h-8 rounded-t-[var(--radius-md)] ${i === 0 ? "w-28" : "w-24"}`}
            />
          ))}
        </div>

        {/* Table header + rows */}
        <div className="card overflow-hidden">
          {/* Table head */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-page)]">
            {["w-20", "w-32", "w-24", "flex-1", "w-16"].map((w, i) => (
              <Skeleton key={i} variant="text" className={`h-3 ${w} rounded-full`} />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="table-row" />
          ))}
        </div>

        {/* Add registro button */}
        <div className="flex justify-end">
          <Skeleton variant="text" className="h-9 w-36 rounded-[var(--radius-md)]" />
        </div>
      </main>
    </>
  );
}
