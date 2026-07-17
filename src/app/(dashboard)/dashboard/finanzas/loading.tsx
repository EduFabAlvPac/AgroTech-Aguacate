import { Skeleton } from "@/components/ui/Skeleton";
import { FinancialChartSkeleton } from "@/components/dashboard/FinancialChart";

// ── Finanzas loading.tsx ──────────────────────────────────────────────────────
// Shown while FinanzasPage fetches gastos, ingresos, and cultivos.
// Mirrors the FinanzasClient layout: summary cards, chart, tables.

export default function FinanzasLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="flex flex-col gap-1 px-6 py-4 border-b border-[var(--border-subtle)]">
        <Skeleton variant="text" className="h-5 w-28 rounded-md" />
        <Skeleton variant="text" className="h-3.5 w-72 rounded-full" />
      </div>

      <main className="page-scroll space-y-6">
        {/* Summary KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "w-20", value: "w-24" },
            { label: "w-16", value: "w-28" },
            { label: "w-24", value: "w-20" },
          ].map(({ label, value }, i) => (
            <div key={i} className="card p-5 space-y-2">
              <Skeleton variant="text" className={`h-3 ${label} rounded-full`} />
              <Skeleton variant="text" className={`h-7 ${value} rounded-md`} />
              <Skeleton variant="text" className="h-3 w-3/4 rounded-full" />
            </div>
          ))}
        </div>

        {/* Chart skeleton */}
        <FinancialChartSkeleton />

        {/* Tabs: Gastos / Ingresos */}
        <div className="flex gap-1 border-b border-[var(--border-subtle)]">
          <Skeleton variant="text" className="h-8 w-24 rounded-t-[var(--radius-md)]" />
          <Skeleton variant="text" className="h-8 w-24 rounded-t-[var(--radius-md)]" />
        </div>

        {/* Toolbar: filter + add button */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <Skeleton variant="text" className="h-8 w-32 rounded-[var(--radius-md)]" />
            <Skeleton variant="text" className="h-8 w-28 rounded-[var(--radius-md)]" />
          </div>
          <Skeleton variant="text" className="h-8 w-36 rounded-[var(--radius-md)]" />
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          {/* Table head */}
          <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface-page)]">
            {["w-24", "w-32", "w-20", "flex-1", "w-20", "w-16"].map((w, i) => (
              <Skeleton key={i} variant="text" className={`h-3 ${w} rounded-full`} />
            ))}
          </div>
          {/* Rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="table-row" />
          ))}
        </div>
      </main>
    </>
  );
}
