"use client";

import dynamic from "next/dynamic";
import type { Finca, Lote, Cultivo } from "@prisma/client";
import { ETAPA_LABELS } from "@/types";

type LoteWithCultivo = Lote & { cultivos: Partial<Cultivo>[] };
type FincaWithLotes = (Finca & { lotes: LoteWithCultivo[] }) | null;

// Lazy-load Leaflet only on client
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-agro-50 text-agro-400">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-agro-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[13px]">Cargando mapa...</p>
      </div>
    </div>
  ),
});

interface MapaContainerProps {
  finca: FincaWithLotes;
}

export function MapaContainer({ finca }: MapaContainerProps) {
  return (
    <div className="flex h-full" style={{ height: "calc(100vh - 64px)" }}>
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-[var(--border-subtle)] overflow-y-auto flex-shrink-0 p-4">
        <div className="mb-4">
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            {finca?.nombre ?? "Mi Finca"}
          </h2>
          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
            {finca?.municipio} · {finca?.areaTotal ?? 0} ha totales
          </p>
        </div>

        <div className="space-y-3">
          {finca?.lotes.map((lote, i) => {
            const cultivo = lote.cultivos[0];
            const colors = ["#639922", "#1D9E75"];

            return (
              <div
                key={lote.id}
                className="p-3 rounded-[var(--radius-lg)] border"
                style={{ borderColor: colors[i % colors.length] + "33", background: colors[i % colors.length] + "0D" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ background: colors[i % colors.length] }}
                  />
                  <span className="text-[13px] font-semibold" style={{ color: colors[i % colors.length] }}>
                    {lote.nombre}
                  </span>
                  <span className="ml-auto text-[11px] text-[var(--text-muted)]">
                    {lote.areaHa} ha
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                  {lote.altitud && <div>Altitud: {lote.altitud.toLocaleString()} msnm</div>}
                  {lote.pendiente && <div>Pendiente: {lote.pendiente}°</div>}
                  {cultivo && (
                    <>
                      <div>Variedad: {cultivo.variedad}</div>
                      {cultivo.etapa && (
                        <div>Etapa: {ETAPA_LABELS[cultivo.etapa]}</div>
                      )}
                      {cultivo.cantidadPlantas && (
                        <div>Plantas: {cultivo.cantidadPlantas}</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)]">
          <div className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wide mb-2">
            Leyenda
          </div>
          <div className="space-y-1.5">
            {[
              { color: "#639922", label: "Aguacate Hass · Lote A" },
              { color: "#1D9E75", label: "Aguacate Hass · Lote B" },
              { color: "#5DCAA5", label: "Fuente hídrica" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Map */}
      <div className="flex-1">
        <LeafletMap finca={finca} />
      </div>
    </div>
  );
}
