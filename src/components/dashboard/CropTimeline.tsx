import { Check, Sprout, Leaf, TreePine, Apple, Scissors } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { CropTimelineData } from "@/lib/data/dashboard";

interface CropTimelineProps {
  data: CropTimelineData;
}

// Genérico — mismas etapas fenológicas del enum EtapaCultivo, sin asumir
// duración/fecha específica de ningún cultivo (antes tenía fechas y
// toneladas fijas de ejemplo hardcodeadas para aguacate Hass — CLAUDE.md §4).
const STAGES = [
  { key: "PREPARACION", label: "Preparación del terreno", icon: Scissors, description: "Subsolado, nivelación y trazado" },
  { key: "SIEMBRA", label: "Siembra", icon: Sprout, description: "Plantación y primer riego" },
  { key: "ESTABLECIMIENTO", label: "Establecimiento", icon: Leaf, description: "Arraigo y primeras hojas" },
  { key: "CRECIMIENTO", label: "Crecimiento vegetativo", icon: TreePine, description: "Desarrollo de copa y raíces" },
  { key: "PRODUCCION", label: "Producción inicial", icon: Apple, description: "Primera floración y amarre" },
  { key: "COSECHA", label: "Cosecha", icon: Apple, description: "Recolección" },
];

export function CropTimeline({ data }: CropTimelineProps) {
  const {
    especieLabel, fincaNombre, fechaSiembra, fechaCosechaEst,
    currentEtapa, progreso, diasRestantes, produccionEstimadaKg,
  } = data;
  const currentIndex = STAGES.findIndex((s) => s.key === currentEtapa);

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Ciclo del cultivo
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            {especieLabel}{fincaNombre ? ` · ${fincaNombre}` : ""}
          </p>
        </div>
        <span className="badge badge-warning">
          Etapa {currentIndex + 1} / {STAGES.length}
        </span>
      </div>

      {/* Global progress */}
      <div className="mb-5">
        <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-1.5">
          <span>{fechaSiembra ? `Siembra ${format(fechaSiembra, "dd MMM yyyy", { locale: es })}` : "Sin fecha de siembra"}</span>
          <span>{fechaCosechaEst ? `Cosecha est. ${format(fechaCosechaEst, "MMM yyyy", { locale: es })}` : "Sin proyección"}</span>
        </div>
        <div className="h-1.5 bg-[var(--surface-page)] rounded-full overflow-hidden">
          <div
            className="h-full bg-agro-400 rounded-full transition-all duration-700"
            style={{ width: `${progreso.toFixed(1)}%` }}
          />
        </div>
        <div className="text-[11px] text-agro-400 mt-1">
          {fechaCosechaEst
            ? `${progreso.toFixed(0)}% completado · ~${diasRestantes} días restantes`
            : "Registra la especie y fecha de siembra del cultivo para proyectar la cosecha"}
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
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-agro-50 rounded-[var(--radius-md)] text-center">
        {fechaCosechaEst ? (
          <>
            <span className="text-[12px] text-[var(--text-secondary)]">
              Primera cosecha estimada:{" "}
            </span>
            <span className="text-[12px] font-semibold text-agro-600">
              {format(fechaCosechaEst, "MMMM yyyy", { locale: es })}
              {produccionEstimadaKg ? ` · ${Math.round(produccionEstimadaKg).toLocaleString("es-CO")} kg estimados` : ""}
            </span>
          </>
        ) : (
          <span className="text-[12px] text-[var(--text-muted)]">
            Registra un cultivo con fecha de siembra para ver la proyección de cosecha
          </span>
        )}
      </div>
    </div>
  );
}
