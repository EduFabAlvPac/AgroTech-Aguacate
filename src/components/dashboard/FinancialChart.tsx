"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Plus } from "lucide-react";
import Link from "next/link";
import { formatCOP, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

const MONTHLY_DATA = [
  { mes: "Ene", gastos: 820000, ingresos: 0 },
  { mes: "Feb", gastos: 940000, ingresos: 0 },
  { mes: "Mar", gastos: 760000, ingresos: 0 },
  { mes: "Abr", gastos: 1180000, ingresos: 0 },
  { mes: "May", gastos: 1140000, ingresos: 0 },
  { mes: "Jun", gastos: 1310000, ingresos: 0 },
  { mes: "Jul", gastos: 2450000, ingresos: 0 },
  { mes: "Ago", gastos: 0, ingresos: 0 },
  { mes: "Sep", gastos: 0, ingresos: 0 },
  { mes: "Oct", gastos: 0, ingresos: 0 },
  { mes: "Nov", gastos: 0, ingresos: 0 },
  { mes: "Dic", gastos: 0, ingresos: 0 },
];

const totalGastos = MONTHLY_DATA.reduce((s, d) => s + d.gastos, 0);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-2.5 shadow-sm text-[12px]">
        <p className="font-semibold text-[var(--text-primary)] mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {formatCOP(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ── FinancialChartSkeleton ────────────────────────────────────────────────────
// Fallback skeleton that mirrors the chart card layout.
// Use as the Suspense fallback while financial data loads from the server.

export function FinancialChartSkeleton() {
  // 12 month columns — same count as the real chart
  const bars = Array.from({ length: 12 });

  return (
    <div className="card p-5" aria-label="Cargando finanzas...">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-1.5">
          <Skeleton variant="text" className="h-4 w-32 rounded-md" />
          <Skeleton variant="text" className="h-3 w-64 rounded-full" />
        </div>
        {/* Legend + buttons placeholder */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <Skeleton variant="text" className="h-3 w-14 rounded-full" />
            <Skeleton variant="text" className="h-3 w-16 rounded-full" />
          </div>
          <Skeleton variant="text" className="h-7 w-28 rounded-[var(--radius-md)]" />
          <Skeleton variant="text" className="h-7 w-28 rounded-[var(--radius-md)]" />
        </div>
      </div>

      {/* Bar chart area */}
      <div className="flex items-end gap-[3px] h-[180px] px-1" aria-hidden="true">
        {bars.map((_, i) => {
          // Vary heights to look natural (matching real bar shape)
          const heights = [42, 48, 38, 58, 56, 64, 76, 20, 20, 20, 20, 20];
          const h = heights[i] ?? 20;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end gap-0.5">
              <div
                className={cn(
                  "animate-pulse bg-[var(--border-subtle)] rounded-t-[3px] w-full",
                )}
                style={{ height: `${h}%` }}
              />
              {/* Month label placeholder */}
              <div className="animate-pulse bg-[var(--border-subtle)] rounded-full h-2 w-full mt-1" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface FinancialChartProps {
  userId: string;
}

export function FinancialChart({ userId }: FinancialChartProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Finanzas 2026
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            Gastos acumulados: {formatCOP(totalGastos)} · Ingresos: $0 (primer año de establecimiento)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-[11px] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-300 inline-block"></span>Gastos
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-agro-200 inline-block"></span>Ingresos
            </span>
          </div>
          <Link
            href="/dashboard/finanzas"
            className="flex items-center gap-1.5 text-[12px] font-medium text-agro-400 hover:text-agro-600 border border-agro-100 bg-agro-50 px-3 py-1.5 rounded-[var(--radius-md)] transition-colors"
          >
            <TrendingUp size={14} />
            Ver finanzas
          </Link>
          <Link
            href="/dashboard/finanzas"
            className="flex items-center gap-1.5 text-[12px] font-medium text-white bg-agro-400 hover:bg-agro-600 px-3 py-1.5 rounded-[var(--radius-md)] transition-colors"
          >
            <Plus size={14} />
            Registrar gasto
          </Link>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={MONTHLY_DATA} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1EFE8" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fontSize: 11, fill: "#8FA080" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#8FA080" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v === 0 ? "" : `$${(v / 1000000).toFixed(1)}M`)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="gastos" name="Gastos" fill="#F09595" radius={[3, 3, 0, 0]} />
          <Bar dataKey="ingresos" name="Ingresos" fill="#97C459" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
