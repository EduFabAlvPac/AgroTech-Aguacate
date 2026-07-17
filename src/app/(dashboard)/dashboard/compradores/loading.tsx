import { Skeleton } from "@/components/ui/Skeleton";

// ── Compradores loading.tsx ───────────────────────────────────────────────────
// Shown while CompradoresPage fetches the compradores list.
// Mirrors the CompradoresClient layout: toolbar + grid of cards.

export default function CompradoresLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex flex-col gap-1 px-6 py-4 border-b border-[var(--border-subtle)]">
        <Skeleton variant="text" className="h-5 w-40 rounded-md" />
        <Skeleton variant="text" className="h-3.5 w-72 rounded-full" />
      </div>

      <main className="page-scroll space-y-5">
        {/* Toolbar: search + add button */}
        <div className="flex items-center justify-between gap-3">
          <Skeleton variant="text" className="h-9 w-64 rounded-[var(--radius-md)]" />
          <Skeleton variant="text" className="h-9 w-36 rounded-[var(--radius-md)]" />
        </div>

        {/* Compradores grid — 1 col mobile, 2 sm, 3 lg */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="card p-5 space-y-4"
            >
              {/* Top: avatar + name + type badge */}
              <div className="flex items-start gap-3">
                <Skeleton variant="avatar" className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton variant="text" className="h-4 w-3/4 rounded-md" />
                  <Skeleton variant="text" className="h-3 w-1/2 rounded-full" />
                </div>
                <Skeleton variant="text" className="h-5 w-20 rounded-full" />
              </div>

              {/* Info rows */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton variant="text" className="h-3.5 w-3.5 rounded-sm shrink-0" />
                  <Skeleton variant="text" className="h-3 w-32 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton variant="text" className="h-3.5 w-3.5 rounded-sm shrink-0" />
                  <Skeleton variant="text" className="h-3 w-40 rounded-full" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton variant="text" className="h-3.5 w-3.5 rounded-sm shrink-0" />
                  <Skeleton variant="text" className="h-3 w-24 rounded-full" />
                </div>
              </div>

              {/* Footer: stats + actions */}
              <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                <Skeleton variant="text" className="h-3.5 w-24 rounded-full" />
                <div className="flex gap-2">
                  <Skeleton variant="text" className="h-7 w-7 rounded-[var(--radius-md)]" />
                  <Skeleton variant="text" className="h-7 w-7 rounded-[var(--radius-md)]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
