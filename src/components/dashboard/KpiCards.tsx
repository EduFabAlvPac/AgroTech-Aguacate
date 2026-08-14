import { Sprout, Calendar, TrendingDown, AlertTriangle, TrendingUp } from "lucide-react";
import { formatCOP, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import Link from "next/link";
import type { DashboardKpis } from "@/lib/data/dashboard";

// KpiCardsProps == DashboardKpis (el contrato de datos vive en
// src/lib/data/dashboard.ts — Fase 1, ver ADR-006). El componente ya no
// decide la "próxima actividad" (antes tenía su propio getProximaActividad
// aquí) — solo pinta lo que la capa de datos ya resolvió.
type KpiCardsProps = DashboardKpis;

const URGENCIA_COLORS = {
  alta: { text: "text-negative-600", bg: "bg-negative-50" },
  media: { text: "text-harvest-400", bg: "bg-harvest-50" },
  baja: { text: "text-positive-600", bg: "bg-positive-50" },
};

export function KpiCards({ totalHa, totalPlantas, gastosMes, alertasActivas, ingresosTotal, etapaCultivo, variedad, cosechaEstimada, proximaActividad }: KpiCardsProps) {
  const urgColors = URGENCIA_COLORS[proximaActividad.urgencia];

  const kpis = [
    {
      label: "Hectáreas activas",
      value: `${totalHa.toFixed(1)} ha`,
      sub: totalPlantas > 0 ? `${totalPlantas} plantas${variedad ? ` · ${variedad}` : ""}` : "Sin plantas registradas",
      icon: Sprout,
      iconColor: "text-agro-400",
      valueColor: "text-agro-600",
      bg: "bg-agro-50",
    },
    {
      label: "Días a la cosecha",
      value: cosechaEstimada ? `~${Math.max(cosechaEstimada.dias, 0)}` : "—",
      sub: cosechaEstimada ? `Est. ${cosechaEstimada.fechaLabel} · primera producción` : "Sin cultivo activo",
      icon: Calendar,
      iconColor: "text-harvest-200",
      valueColor: "text-[var(--text-primary)]",
      bg: "bg-harvest-50",
    },
    {
      label: "Próxima actividad",
      value: `${proximaActividad.icono} ${proximaActividad.texto}`,
      sub: etapaCultivo ? `Urgencia ${proximaActividad.urgencia}` : "Aún no hay cultivo activo",
      icon: Sprout,
      iconColor: urgColors.text,
      valueColor: urgColors.text,
      bg: urgColors.bg,
      href: "/dashboard/cultivos",
    },
    {
      label: "Gastos del mes",
      value: formatCOP(gastosMes),
      sub: "Costos acumulados · mes actual",
      icon: TrendingDown,
      iconColor: "text-negative-400",
      valueColor: "text-negative-600",
      bg: "bg-negative-50",
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpis.map(({ label, value, sub, icon: Icon, iconColor, valueColor, bg, href }) => {
        const content = (
          <div className={cn("card p-5", href && "cursor-pointer hover:shadow-md transition-shadow")}>
            <div className={`w-9 h-9 rounded-[var(--radius-md)] ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={iconColor} />
            </div>
            <div className={`text-xl font-semibold tracking-tight ${valueColor} mb-1`}>
              {value}
            </div>
            <div className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide mb-0.5">
              {label}
            </div>
            <div className="text-[12px] text-[var(--text-secondary)]">{sub}</div>
          </div>
        );

        if (href) {
          return <Link key={label} href={href as any}>{content}</Link>;
        }
        return <div key={label}>{content}</div>;
      })}
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
  "bg-negative-50",
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
