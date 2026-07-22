"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Plus } from "lucide-react";
import Link from "next/link";
import { formatCOP, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

interface MonthlyData {
  mes: string;
  gastos: number;
  ingresos: number;
}

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

export function FinancialChartSkeleton() {
  const bars = Array.from({ length: 12 });

  return (
    <div className="card p-5" aria-label="Cargando finanzas...">
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-1.5">
          <Skeleton variant="text" className="h-4 w-32 rounded-md" />
          <Skeleton variant="text" className="h-3 w-64 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4">
            <Skeleton variant="text" className="h-3 w-14 rounded-full" />
            <Skeleton variant="text" className="h-3 w-16 rounded-full" />
          </div>
          <Skeleton variant="text" className="h-7 w-28 rounded-[var(--radius-md)]" />
          <Skeleton variant="text" className="h-7 w-28 rounded-[var(--radius-md)]" />
        </div>
      </div>
      <div className="flex items-end gap-[3px] h-[180px] px-1" aria-hidden="true">
        {bars.map((_, i) => {
          const heights = [42, 48, 38, 58, 56, 64, 76, 20, 20, 20, 20, 20];
          const h = heights[i] ?? 20;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end gap-0.5">
              <div
                className={cn("animate-pulse bg-[var(--border-subtle)] rounded-t-[3px] w-full")}
                style={{ height: `${h}%` }}
              />
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
  initialData?: MonthlyData[];
  totalGastos?: number;
  totalIngresos?: number;
}

export function FinancialChart({ initialData, totalGastos: propTotalGastos, totalIngresos: propTotalIngresos }: FinancialChartProps) {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>(initialData ?? []);
  const [totalGastos, setTotalGastos] = useState(propTotalGastos ?? 0);
  const [totalIngresos, setTotalIngresos] = useState(propTotalIngresos ?? 0);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    if (initialData) return; // Already have server-provided data

    async function fetchData() {
      try {
        const res = await fetch("/api/gastos");
        const { data: gastos } = await res.json();

        const ingresoRes = await fetch("/api/ingresos");
        const { data: ingresos } = await ingresoRes.json();

        const year = new Date().getFullYear();
        const months = Array.from({ length: 12 }, (_, i) => {
          const mes = new Date(year, i, 1).toLocaleDateString("es-CO", { month: "short" });
          const gastosMonth = (gastos ?? [])
            .filter((g: any) => {
              const d = new Date(g.fecha);
              return d.getMonth() === i && d.getFullYear() === year;
            })
            .reduce((s: number, g: any) => s + g.monto, 0);
          const ingresosMonth = (ingresos ?? [])
            .filter((ing: any) => {
              const d = new Date(ing.fecha);
              return d.getMonth() === i && d.getFullYear() === year;
            })
            .reduce((s: number, ing: any) => s + ing.monto, 0);
          return { mes, gastos: gastosMonth, ingresos: ingresosMonth };
        });

        setMonthlyData(months);
        setTotalGastos(months.reduce((s, m) => s + m.gastos, 0));
        setTotalIngresos(months.reduce((s, m) => s + m.ingresos, 0));
      } catch {
        // Keep empty state on error
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [initialData]);

  if (loading) return <FinancialChartSkeleton />;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Finanzas {new Date().getFullYear()}
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            Gastos acumulados: {formatCOP(totalGastos)}
            {totalIngresos > 0 && ` · Ingresos: ${formatCOP(totalIngresos)}`}
            {totalIngresos === 0 && " · Ingresos: $0 (primer año de establecimiento)"}
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
        <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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
