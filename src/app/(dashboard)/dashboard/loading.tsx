import { KpiCardsSkeleton } from "@/components/dashboard/KpiCards";
import { FinancialChartSkeleton } from "@/components/dashboard/FinancialChart";
import { Skeleton } from "@/components/ui/Skeleton";

// ── Dashboard loading.tsx ─────────────────────────────────────────────────────
// Shown by Next.js App Router while the dashboard page fetches data.
// Mirrors the layout: KPI cards, map+weather row, timeline+chat row, chart, buyers.

export default function DashboardLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex flex-col gap-1 px-6 py-4 border-b border-[var(--border-subtle)]">
        <Skeleton variant="text" className="h-5 w-36 rounded-md" />
        <Skeleton variant="text" className="h-3.5 w-56 rounded-full" />
      </div>

      <main className="page-scroll space-y-6">
        {/* KPI cards */}
        <KpiCardsSkeleton />

        {/* Row 1: Map + Weather */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 card p-0 overflow-hidden h-64 animate-pulse bg-[var(--border-subtle)]" />
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Weather card */}
            <div className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton variant="text" className="h-4 w-28 rounded-md" />
                <Skeleton variant="text" className="h-3.5 w-20 rounded-full" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton variant="avatar" className="w-12 h-12" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton variant="text" className="h-7 w-20 rounded-md" />
                  <Skeleton variant="text" className="h-3 w-32 rounded-full" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} variant="text" className="h-12 rounded-[var(--radius-md)]" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Crop Timeline + AI Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline skeleton */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton variant="text" className="h-4 w-32 rounded-md" />
              <Skeleton variant="text" className="h-3.5 w-20 rounded-full" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-start">
                <Skeleton variant="avatar" className="w-8 h-8 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton variant="text" className="h-3.5 w-3/4 rounded-full" />
                  <Skeleton variant="text" className="h-3 w-1/2 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* AI Chat preview skeleton */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton variant="avatar" className="w-8 h-8 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton variant="text" className="h-3.5 w-32 rounded-md" />
                <Skeleton variant="text" className="h-3 w-48 rounded-full" />
              </div>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                variant="text"
                className={`h-9 rounded-[var(--radius-md)] ${i % 2 === 0 ? "w-4/5" : "w-2/3 ml-auto"}`}
              />
            ))}
            <Skeleton variant="text" className="h-10 w-full rounded-[var(--radius-md)]" />
          </div>
        </div>

        {/* Row 3: Financial Chart */}
        <FinancialChartSkeleton />

        {/* Row 4: Buyers preview */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton variant="text" className="h-4 w-40 rounded-md" />
            <Skeleton variant="text" className="h-7 w-24 rounded-[var(--radius-md)]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="card" />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
