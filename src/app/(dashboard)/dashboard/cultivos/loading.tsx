import { Skeleton } from "@/components/ui/Skeleton";

// ── Cultivos loading.tsx ──────────────────────────────────────────────────────
// Shown while CultivosPage fetches finca + lotes + cultivos data.
// Mirrors the list layout: header, then cultivo cards per lote.

export default function CultivosLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex flex-col gap-1 px-6 py-4 border-b border-[var(--border-subtle)]">
        <Skeleton variant="text" className="h-5 w-32 rounded-md" />
        <Skeleton variant="text" className="h-3.5 w-64 rounded-full" />
      </div>

      <main className="page-scroll space-y-6">
        {/* Lote section — show 2 placeholder lote groups */}
        {Array.from({ length: 2 }).map((_, loteIdx) => (
          <div key={loteIdx} className="space-y-3">
            {/* Lote header: badge + name + area */}
            <div className="flex items-center gap-3">
              <Skeleton variant="text" className="h-6 w-20 rounded-full" />
              <Skeleton variant="text" className="h-4 w-40 rounded-md" />
              <Skeleton variant="text" className="h-3.5 w-16 rounded-full" />
            </div>

            {/* Cultivo cards inside the lote */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="card p-5 space-y-4"
                >
                  {/* Top row: stage badge + variedad */}
                  <div className="flex items-center justify-between">
                    <Skeleton variant="text" className="h-5 w-24 rounded-full" />
                    <Skeleton variant="text" className="h-4 w-16 rounded-full" />
                  </div>

                  {/* Info rows */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton variant="text" className="h-3 w-24 rounded-full" />
                      <Skeleton variant="text" className="h-3 w-16 rounded-full" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton variant="text" className="h-3 w-20 rounded-full" />
                      <Skeleton variant="text" className="h-3 w-20 rounded-full" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton variant="text" className="h-3 w-16 rounded-full" />
                      <Skeleton variant="text" className="h-3 w-12 rounded-full" />
                    </div>
                  </div>

                  {/* Footer: counters + action */}
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                    <div className="flex gap-3">
                      <Skeleton variant="text" className="h-5 w-14 rounded-full" />
                      <Skeleton variant="text" className="h-5 w-14 rounded-full" />
                    </div>
                    <Skeleton variant="text" className="h-7 w-20 rounded-[var(--radius-md)]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </>
  );
}
