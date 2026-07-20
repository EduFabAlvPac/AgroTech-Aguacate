"use client";

import { Pencil, MapPin, Plus, Map, Trash2 } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { LOTE_COLORS } from "@/lib/constants";
import { ETAPA_LABELS } from "@/types";
import type { Finca, Lote, Cultivo, EtapaCultivo } from "@prisma/client";
import toast from "react-hot-toast";

type LoteWithCultivo = Lote & {
  cultivos: Partial<Cultivo>[];
  _count?: { cultivos: number };
};
type FincaWithLotes = (Finca & { lotes: LoteWithCultivo[] }) | null;

interface MapSidebarProps {
  finca: FincaWithLotes;
  lotes: LoteWithCultivo[];
  onStartDraw: () => void;
  onStartDrawForLote: (loteId: string) => void;
  onStartEdit: (loteId: string) => void;
  onDeleteLote?: (loteId: string) => void;
}

export function MapSidebar({
  finca,
  lotes,
  onStartDraw,
  onStartDrawForLote,
  onStartEdit,
  onDeleteLote,
}: MapSidebarProps) {
  return (
    <aside className="w-72 bg-white border-r border-[var(--border-subtle)] overflow-y-auto flex-shrink-0 p-4">
      {/* Finca header */}
      <div className="mb-4">
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
          {finca?.nombre ?? "Mi Finca"}
        </h2>
        <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
          {finca?.municipio} · {finca?.areaTotal ?? 0} ha totales
        </p>
      </div>

      {/* "Dibujar nuevo lote" button */}
      <div className="mb-4">
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={onStartDraw}
        >
          <Plus size={14} />
          Dibujar nuevo lote
        </Button>
      </div>

      {/* Lotes list or empty state */}
      {lotes.length === 0 ? (
        <EmptyState
          icon={<Map size={24} />}
          title="No hay lotes registrados"
          description="Dibuja tu primer lote en el mapa para comenzar a georreferenciar tu finca."
          action={
            <Button variant="primary" size="sm" onClick={onStartDraw}>
              <Plus size={14} />
              Dibujar nuevo lote
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {lotes.map((lote, i) => {
            const cultivo = lote.cultivos[0];
            const color = LOTE_COLORS[i % LOTE_COLORS.length];
            const hasGeoJson = lote.geoJson != null;
            const cultivoCount = lote._count?.cultivos ?? 0;
            const hasCultivos = cultivoCount > 0;

            return (
              <div
                key={lote.id}
                className="p-3 rounded-[var(--radius-lg)] border"
                style={{ borderColor: color + "33", background: color + "0D" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ background: color }}
                  />
                  <span className="text-[13px] font-semibold" style={{ color }}>
                    {lote.nombre}
                  </span>

                  <div className="ml-auto flex items-center gap-1">
                    {/* Action icon: Pencil for edit (has geoJson), MapPin for draw (no geoJson) */}
                    {hasGeoJson ? (
                      <button
                        onClick={() => onStartEdit(lote.id)}
                        className="p-1 rounded hover:bg-black/5 transition-colors"
                        title="Editar área"
                      >
                        <Pencil size={14} className="text-[var(--text-muted)]" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onStartDrawForLote(lote.id)}
                        className="p-1 rounded hover:bg-black/5 transition-colors"
                        title="Dibujar área de este lote"
                      >
                        <MapPin size={14} className="text-[#BA7517]" />
                      </button>
                    )}

                    {/* Delete button */}
                    {hasCultivos ? (
                      <button
                        disabled
                        className="p-1 rounded opacity-40 cursor-not-allowed"
                        title="Elimina el cultivo antes de eliminar el lote"
                      >
                        <Trash2 size={14} className="text-[var(--text-muted)]" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          toast((t) => (
                            <div className="flex items-center gap-3">
                              <span className="text-[13px]">¿Eliminar {lote.nombre}?</span>
                              <button
                                onClick={() => { toast.dismiss(t.id); onDeleteLote?.(lote.id); }}
                                className="px-3 py-1 bg-red-500 text-white text-[12px] rounded-md font-medium"
                              >
                                Eliminar
                              </button>
                              <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 border text-[12px] rounded-md">
                                No
                              </button>
                            </div>
                          ), { duration: 10000 });
                        }}
                        className="p-1 rounded hover:bg-red-50 transition-colors"
                        title="Eliminar lote"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {lote.areaHa} ha
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                  {lote.altitud && (
                    <div>Altitud: {lote.altitud.toLocaleString()} msnm</div>
                  )}
                  {lote.pendiente && <div>Pendiente: {lote.pendiente}°</div>}
                  {cultivo && (
                    <>
                      <div>Variedad: {cultivo.variedad}</div>
                      {cultivo.etapa && (
                        <div>
                          Etapa: {ETAPA_LABELS[cultivo.etapa as EtapaCultivo]}
                        </div>
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
      )}
    </aside>
  );
}
