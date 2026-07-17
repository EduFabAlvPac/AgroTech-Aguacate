import { Sprout, Calendar, TrendingDown, AlertTriangle, TrendingUp } from "lucide-react";
import { formatCOP, cn } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/Skeleton";

interface KpiCardsProps {
  totalHa: number;
  totalPlantas: number;
  gastosMes: number;
  alertasActivas: number;
  ingresosTotal: number;
}

const FECHA_COSECHA_EST = new Date("2028-01-15");

export function KpiCards({ totalHa, totalPlantas, gastosMes, alertasActivas, ingresosTotal }: KpiCardsProps) {
  const diasAlCorte = differenceInDays(FECHA_COSECHA_EST, new Date());

  const kpis = [
    {
      label: "Hectáreas activas",
      value: `${totalHa.toFixed(1)} ha`,
      sub: `${totalPlantas} plantas · Hass`,
      icon: Sprout,
      iconColor: "text-agro-400",
      valueColor: "text-agro-600",
      bg: "bg-agro-50",
    },
    {
      label: "Días a la cosecha",
      value: `~${diasAlCorte}`,
      sub: "Est. Ene 2028 · primera producción",
      icon: Calendar,
      iconColor: "text-harvest-200",
      valueColor: "text-[var(--text-primary)]",
      bg: "bg-harvest-50",
    },
    {
      label: "Ingresos totales",
      value: formatCOP(ingresosTotal),
      sub: ingresosTotal > 0 ? "Ventas registradas · acumulado" : "Sin ingresos registrados",
      icon: TrendingUp,
      iconColor: "text-teal-400",
      valueColor: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      label: "Gastos del mes",
      value: formatCOP(gastosMes),
      sub: "Costos acumulados · mes actual",
      icon: TrendingDown,
      iconColor: "text-red-400",
      valueColor: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Alertas activas",
      value: alertasActivas.toString(),
      sub: alertasActivas > 0 ? "Requieren atención" : "Sin alertas pendientes",
      icon: AlertTriangle,
      iconColor: alertasActivas > 0 ? "text-harvest-200" : "text-[var(--text-muted)]",
      valueColor: alertasActivas > 0 ? "text-harvest-400" : "text-[var(--text-primary)]",
      bg: alertasActivas > 0 ? "bg-harvest-50" : "bg-[var(--surface-page)]",
    },
  ];

  return (
    <div className="kpi-grid">
      {kpis.map(({ label, value, sub, icon: Icon, iconColor, valueColor, bg }) => (
        <div key={label} className="card p-5">
          <div className={`w-9 h-9 rounded-[var(--radius-md)] ${bg} flex items-center justify-center mb-3`}>
            <Icon size={18} className={iconColor} />
          </div>
          <div className={`text-2xl font-semibold tracking-tight ${valueColor} mb-1`}>
            {value}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide mb-0.5">
            {label}
          </div>
          <div className="text-[12px] text-[var(--text-secondary)]">{sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── KpiCardsSkeleton ──────────────────────────────────────────────────────────
// Fallback skeleton that mirrors the KPI card layout exactly.
// Use as the Suspense fallback while KPI data is loading from the server.

const skeletonBgs = [
  "bg-agro-50",
  "bg-harvest-50",
  "bg-teal-50",
  "bg-red-50",
  "bg-[var(--surface-page)]",
];

export function KpiCardsSkeleton() {
  return (
    <div className="kpi-grid" aria-label="Cargando KPIs...">
      {skeletonBgs.map((bg, i) => (
        <div key={i} className="card p-5">
          {/* Icon placeholder */}
          <div className={cn("w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center mb-3", bg)}>
            <div className="w-[18px] h-[18px] rounded-sm animate-pulse bg-[var(--border-subtle)]" />
          </div>
          {/* Value placeholder — wide, taller line */}
          <Skeleton variant="text" className="h-7 w-3/4 rounded-md mb-2" />
          {/* Label placeholder — narrow, short */}
          <Skeleton variant="text" className="h-2.5 w-1/2 rounded-full mb-1.5" />
          {/* Sub-label placeholder */}
          <Skeleton variant="text" className="h-3 w-5/6 rounded-full" />
        </div>
      ))}
    </div>
  );
}
