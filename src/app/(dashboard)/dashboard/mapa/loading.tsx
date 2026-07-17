import { Skeleton } from "@/components/ui/Skeleton";

// ── Mapa loading.tsx ──────────────────────────────────────────────────────────
// Shown while MapaPage fetches the finca + lotes data.
// Mirrors the MapaContainer layout: full-height map area + lote list sidebar.

export default function MapaLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex flex-col gap-1 px-6 py-4 border-b border-[var(--border-subtle)]">
        <Skeleton variant="text" className="h-5 w-32 rounded-md" />
        <Skeleton variant="text" className="h-3.5 w-72 rounded-full" />
      </div>

      {/* Map area — fills remaining height like the real page */}
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-0">
        {/* Map canvas placeholder */}
        <div
          className="flex-1 relative animate-pulse bg-[var(--border-subtle)]"
          style={{ minHeight: "360px" }}
        >
          {/* Center loader indicator */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-[var(--border-subtle)] animate-pulse" />
            </div>
            <Skeleton variant="text" className="h-3.5 w-40 rounded-full bg-white/60" />
          </div>

          {/* Fake map attribution bar at bottom */}
          <div className="absolute bottom-2 left-2 flex gap-1">
            <Skeleton variant="text" className="h-4 w-24 rounded-sm bg-white/60" />
          </div>

          {/* Zoom controls placeholder */}
          <div className="absolute top-3 left-3 flex flex-col gap-1">
            <Skeleton variant="text" className="h-7 w-7 rounded-[var(--radius-md)] bg-white/80" />
            <Skeleton variant="text" className="h-7 w-7 rounded-[var(--radius-md)] bg-white/80" />
          </div>
        </div>

        {/* Lote list sidebar */}
        <div
          className="w-full lg:w-72 shrink-0 bg-[var(--surface-card)] border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] flex flex-col"
        >
          {/* Sidebar header */}
          <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
            <Skeleton variant="text" className="h-4 w-28 rounded-md" />
          </div>

          {/* Lote items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 animate-pulse">
                {/* Color dot */}
                <div className="w-3 h-3 rounded-full bg-[var(--border-subtle)] shrink-0 mt-1" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton variant="text" className="h-3.5 w-3/4 rounded-md" />
                  <Skeleton variant="text" className="h-3 w-1/2 rounded-full" />
                  <div className="flex gap-2 pt-0.5">
                    <Skeleton variant="text" className="h-5 w-16 rounded-full" />
                    <Skeleton variant="text" className="h-5 w-14 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
