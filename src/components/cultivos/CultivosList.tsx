"use client";

import { useState } from "react";
import { Plus, Sprout, ClipboardList, DollarSign } from "lucide-react";
import { Button, Modal, EmptyState } from "@/components/ui";
import { RegistroForm } from "@/components/cultivos/RegistroForm";
import { ETAPA_LABELS } from "@/types";
import { formatCOP, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Finca, Lote, Cultivo, RegistroCultivo, EtapaCultivo } from "@prisma/client";

type CultivoWithData = Cultivo & {
  registros: RegistroCultivo[];
  _count: { registros: number; gastos: number };
};

type LoteWithCultivos = Lote & { cultivos: CultivoWithData[] };
type FincaWithLotes = (Finca & { lotes: LoteWithCultivos[] }) | null;

interface CultivosListProps {
  finca: FincaWithLotes;
}

const ETAPA_COLORS: Record<EtapaCultivo, string> = {
  PREPARACION: "badge-neutral",
  SIEMBRA: "badge-warning",
  ESTABLECIMIENTO: "badge-info",
  CRECIMIENTO: "badge-success",
  PRODUCCION: "badge-success",
  COSECHA: "badge-success",
};

export function CultivosList({ finca }: CultivosListProps) {
  const [selectedCultivoId, setSelectedCultivoId] = useState<string | null>(null);
  const [showRegistroModal, setShowRegistroModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!finca || finca.lotes.length === 0) {
    return (
      <EmptyState
        icon={<Sprout size={28} />}
        title="Sin lotes registrados"
        description="Configura tu finca y lotes para comenzar el seguimiento de tus cultivos."
        action={<Button>Configurar finca</Button>}
      />
    );
  }

  const handleNuevoRegistro = (cultivoId: string) => {
    setSelectedCultivoId(cultivoId);
    setShowRegistroModal(true);
  };

  const handleRegistroCreado = () => {
    setShowRegistroModal(false);
    toast.success("Registro creado correctamente");
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      {finca.lotes.map((lote) => (
        <section key={lote.id}>
          {/* Lote header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                {lote.nombre}
              </h2>
              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                {lote.areaHa} ha
                {lote.altitud && ` · ${lote.altitud.toLocaleString()} msnm`}
                {lote.pendiente && ` · Pendiente ${lote.pendiente}°`}
              </p>
            </div>
          </div>

          {lote.cultivos.length === 0 ? (
            <div className="card p-6 text-center text-[13px] text-[var(--text-muted)]">
              Sin cultivos en este lote.
            </div>
          ) : (
            <div className="space-y-4">
              {lote.cultivos.map((cultivo) => (
                <div key={cultivo.id} className="card p-5 animate-fade-in">
                  {/* Cultivo header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[var(--radius-md)] bg-agro-50 flex items-center justify-center">
                        <Sprout size={20} className="text-agro-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                            {cultivo.especie} {cultivo.variedad}
                          </span>
                          <span className={`badge ${ETAPA_COLORS[cultivo.etapa]}`}>
                            {ETAPA_LABELS[cultivo.etapa]}
                          </span>
                        </div>
                        {cultivo.fechaSiembra && (
                          <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                            Siembra: {formatDate(cultivo.fechaSiembra, true)}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleNuevoRegistro(cultivo.id)}
                    >
                      <Plus size={14} />
                      Nuevo registro
                    </Button>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
                      <div className="text-[11px] text-[var(--text-muted)] mb-0.5">Plantas</div>
                      <div className="text-[16px] font-semibold text-[var(--text-primary)]">
                        {cultivo.cantidadPlantas ?? "—"}
                      </div>
                    </div>
                    <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
                      <div className="text-[11px] text-[var(--text-muted)] mb-0.5">
                        <ClipboardList size={11} className="inline mr-1" />
                        Registros
                      </div>
                      <div className="text-[16px] font-semibold text-[var(--text-primary)]">
                        {cultivo._count.registros}
                      </div>
                    </div>
                    <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
                      <div className="text-[11px] text-[var(--text-muted)] mb-0.5">
                        <DollarSign size={11} className="inline mr-1" />
                        Gastos
                      </div>
                      <div className="text-[16px] font-semibold text-[var(--text-primary)]">
                        {cultivo._count.gastos}
                      </div>
                    </div>
                  </div>

                  {/* Recent activity */}
                  {cultivo.registros.length > 0 && (
                    <div>
                      <div className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
                        Actividad reciente
                      </div>
                      <div className="space-y-1.5">
                        {cultivo.registros.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-start gap-2.5 py-1.5 border-b border-[var(--border-subtle)] last:border-0"
                          >
                            <span className="stage-dot bg-agro-200 mt-1.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="text-[12px] text-[var(--text-primary)] block truncate">
                                {r.descripcion}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)]">
                                {formatDate(r.fecha, true)}
                              </span>
                            </div>
                            <span className="badge badge-neutral text-[10px] flex-shrink-0">
                              {r.tipo.replace(/_/g, " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cultivo.notas && (
                    <p className="mt-3 text-[12px] text-[var(--text-secondary)] bg-[var(--surface-page)] rounded-[var(--radius-md)] px-3 py-2">
                      📝 {cultivo.notas}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {/* Registro Modal */}
      <Modal
        isOpen={showRegistroModal}
        onClose={() => setShowRegistroModal(false)}
        title="Nuevo registro de actividad"
      >
        {selectedCultivoId && (
          <RegistroForm
            cultivoId={selectedCultivoId}
            onSuccess={handleRegistroCreado}
            onCancel={() => setShowRegistroModal(false)}
          />
        )}
      </Modal>
    </div>
  );
}
