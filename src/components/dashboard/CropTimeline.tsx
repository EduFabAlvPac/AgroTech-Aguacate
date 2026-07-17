import { Check, Sprout, Leaf, TreePine, Apple, Scissors } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { es } from "date-fns/locale";
import type { Finca, Lote, Cultivo } from "@prisma/client";

type FincaWithLotes = (Finca & { lotes: (Lote & { cultivos: Cultivo[] })[] }) | null;

interface CropTimelineProps {
  finca: FincaWithLotes;
}

const STAGES = [
  {
    key: "PREPARACION",
    label: "Preparación del terreno",
    icon: Scissors,
    description: "Subsolado, nivelación y trazado",
    dateRange: "01 – 08 Jul 2026",
  },
  {
    key: "SIEMBRA",
    label: "Siembra",
    icon: Sprout,
    description: "320 plantas · 160/ha · Hass",
    dateRange: "09 Jul 2026 · en progreso",
    inProgress: true,
  },
  {
    key: "ESTABLECIMIENTO",
    label: "Establecimiento",
    icon: Leaf,
    description: "Arraigo y primeras hojas",
    dateRange: "Sep 2026 – Mar 2027",
  },
  {
    key: "CRECIMIENTO",
    label: "Crecimiento vegetativo",
    icon: TreePine,
    description: "Desarrollo de copa y raíces",
    dateRange: "Abr – Oct 2027",
  },
  {
    key: "PRODUCCION",
    label: "Producción inicial",
    icon: Apple,
    description: "Primera floración y amarre",
    dateRange: "Nov 2027 – Ene 2028",
  },
  {
    key: "COSECHA",
    label: "Cosecha",
    icon: Apple,
    description: "8–12 ton/ha estimadas",
    dateRange: "Ene 2028 en adelante",
  },
];

export function CropTimeline({ finca }: CropTimelineProps) {
  const firstCultivo = finca?.lotes[0]?.cultivos[0];
  const fechaSiembra = firstCultivo?.fechaSiembra
    ? new Date(firstCultivo.fechaSiembra)
    : new Date("2026-07-09");

  const currentEtapa = firstCultivo?.etapa ?? "PREPARACION";
  const currentIndex = STAGES.findIndex((s) => s.key === currentEtapa);
  const diasTotal = differenceInDays(new Date("2028-01-15"), fechaSiembra);
  const diasTranscurridos = differenceInDays(new Date(), fechaSiembra);
  const progreso = Math.min(Math.max((diasTranscurridos / diasTotal) * 100, 0), 100);

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Ciclo del cultivo
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            Aguacate Hass · Finca Álvarez Pacheco
          </p>
        </div>
        <span className="badge badge-warning">
          Etapa {currentIndex + 1} / {STAGES.length}
        </span>
      </div>

      {/* Global progress */}
      <div className="mb-5">
        <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-1.5">
          <span>Siembra {format(fechaSiembra, "dd MMM yyyy", { locale: es })}</span>
          <span>Cosecha est. Ene 2028</span>
        </div>
        <div className="h-1.5 bg-[var(--surface-page)] rounded-full overflow-hidden">
          <div
            className="h-full bg-agro-400 rounded-full transition-all duration-700"
            style={{ width: `${progreso.toFixed(1)}%` }}
          />
        </div>
        <div className="text-[11px] text-agro-400 mt-1">
          {progreso.toFixed(0)}% completado · ~{differenceInDays(new Date("2028-01-15"), new Date())} días restantes
        </div>
      </div>

      {/* Stage list */}
      <div className="space-y-3">
        {STAGES.map((stage, idx) => {
          const StageIcon = stage.icon;
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div
              key={stage.key}
              className={`flex gap-3 items-start ${isPending ? "opacity-40" : ""}`}
            >
              {/* Icon circle */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border
                  ${isDone
                    ? "bg-agro-50 border-agro-200"
                    : isCurrent
                    ? "bg-harvest-50 border-harvest-100"
                    : "bg-[var(--surface-page)] border-[var(--border-subtle)]"
                  }
                `}
              >
                {isDone ? (
                  <Check size={14} className="text-agro-400" />
                ) : (
                  <StageIcon
                    size={14}
                    className={isCurrent ? "text-harvest-200" : "text-[var(--text-muted)]"}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-3 ${idx < STAGES.length - 1 ? "border-b border-[var(--border-subtle)]" : ""}`}>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[13px] font-medium ${
                      isDone
                        ? "text-agro-600"
                        : isCurrent
                        ? "text-harvest-400"
                        : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {stage.label}
                    {isCurrent && (
                      <span className="ml-2 badge badge-warning text-[10px]">
                        En progreso
                      </span>
                    )}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {stage.description}
                </div>
                <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  {stage.dateRange}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-agro-50 rounded-[var(--radius-md)] text-center">
        <span className="text-[12px] text-[var(--text-secondary)]">
          Primera cosecha estimada:{" "}
        </span>
        <span className="text-[12px] font-semibold text-agro-600">
          Enero 2028 · 16–24 toneladas
        </span>
      </div>
    </div>
  );
}
