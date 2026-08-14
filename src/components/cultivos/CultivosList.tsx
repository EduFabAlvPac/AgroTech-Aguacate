"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Plus, Sprout, ClipboardList, DollarSign, Pencil, Trash2, MapPin, Sparkles, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Modal, Input, EmptyState } from "@/components/ui";
import { RegistroForm } from "@/components/cultivos/RegistroForm";
import { DiagnosticoForm } from "@/components/cultivos/DiagnosticoForm";
import { LoteForm } from "@/components/cultivos/LoteForm";
import { CultivoForm } from "@/components/cultivos/CultivoForm";
import { CompartirCultivoModal } from "@/components/cultivos/CompartirCultivoModal";
import { EtapaSelect } from "@/components/cultivos/EtapaSelect";
import { ETAPA_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Lote, Cultivo, RegistroCultivo, EtapaCultivo } from "@prisma/client";
import type { CultivoConDatos, LoteConCultivos, FincaConLotes } from "@/lib/data/cultivos";
import { eliminarLote, type EliminarLoteState } from "@/app/(dashboard)/dashboard/cultivos/lote-actions";
import { eliminarCultivo, type EliminarCultivoState } from "@/app/(dashboard)/dashboard/cultivos/cultivo-actions";
import { eliminarRegistro, type EliminarRegistroState } from "@/app/(dashboard)/dashboard/cultivos/registro-actions";

// Alias locales — mismo tipo que exporta la capa de datos (Fase 1, ver
// ADR-006), se mantiene el nombre "WithData"/"WithCultivos" que ya usaba
// este archivo para no tener que renombrar cada uso interno.
type CultivoWithData = CultivoConDatos;
type LoteWithCultivos = LoteConCultivos;
type FincaWithLotes = FincaConLotes;

interface CultivosListProps {
  finca: FincaWithLotes;
}

const TIPO_BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  RIEGO: { bg: "var(--color-info-bg)", color: "var(--color-info)" },
  FERTILIZACION: { bg: "var(--color-surface-gray)", color: "var(--color-text)" } /* TODO: sin token morado en la paleta nueva */,
  TRATAMIENTO_PLAGAS: { bg: "var(--color-negative-bg)", color: "var(--color-negative)" },
  SIEMBRA: { bg: "var(--color-brand-bg)", color: "var(--color-brand-dark)" },
  PODA: { bg: "var(--color-amber-bg)", color: "#8A5E20" },
  COSECHA: { bg: "var(--color-amber-bg)", color: "#8A5E20" },
  OBSERVACION: { bg: "var(--color-surface-gray)", color: "var(--color-text-soft)" },
  INSPECCION: { bg: "var(--color-info-bg)", color: "var(--color-info)" },
  ALERTA: { bg: "var(--color-amber-bg)", color: "#8A5E20" },
};

function daysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function CultivosList({ finca }: CultivosListProps) {
  const router = useRouter();
  const [lotes, setLotes] = useState<LoteWithCultivos[]>(finca?.lotes ?? []);
  const [selectedCultivoId, setSelectedCultivoId] = useState<string | null>(null);
  const [showRegistroModal, setShowRegistroModal] = useState(false);
  const [diagnosticoCultivoId, setDiagnosticoCultivoId] = useState<string | null>(null);
  const [compartirCultivo, setCompartirCultivo] = useState<{ id: string; label: string } | null>(null);

  // Lote CRUD state
  const [showLoteModal, setShowLoteModal] = useState(false);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);
  const [deletingLote, setDeletingLote] = useState<LoteWithCultivos | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  // Server Action (Fase 1, ADR-006) — useActionState reemplaza el
  // useState(deleteLoading) manual que había antes.
  const [deleteLoteState, deleteLoteFormAction, deleteLotePending] = useActionState(
    eliminarLote.bind(null, deletingLote?.id ?? ""),
    {} as EliminarLoteState
  );
  const [, startDeleteLoteTransition] = useTransition();

  // Cultivo CRUD state
  const [showCultivoModal, setShowCultivoModal] = useState(false);
  const [cultivoModalLoteId, setCultivoModalLoteId] = useState<string | null>(null);
  const [cultivoModalLoteArea, setCultivoModalLoteArea] = useState<number | undefined>(undefined);
  const [editingCultivo, setEditingCultivo] = useState<Cultivo | null>(null);
  const [deletingCultivo, setDeletingCultivo] = useState<CultivoWithData | null>(null);
  const [deleteCultivoConfirm, setDeleteCultivoConfirm] = useState("");
  const [deleteCultivoState, deleteCultivoFormAction, deleteCultivoPending] = useActionState(
    eliminarCultivo.bind(null, deletingCultivo?.id ?? ""),
    {} as EliminarCultivoState
  );
  const [, startDeleteCultivoTransition] = useTransition();

  // Registro edit/delete state
  const [editingRegistro, setEditingRegistro] = useState<RegistroCultivo | null>(null);
  const [editingRegistroCultivoId, setEditingRegistroCultivoId] = useState<string | null>(null);
  const [deletingRegistro, setDeletingRegistro] = useState<{ registroId: string; cultivoId: string } | null>(null);
  const [deleteRegistroState, deleteRegistroFormAction, deleteRegistroPending] = useActionState(
    eliminarRegistro.bind(null, deletingRegistro?.registroId ?? ""),
    {} as EliminarRegistroState
  );
  const [, startDeleteRegistroTransition] = useTransition();

  useEffect(() => {
    if (!deletingLote) return;
    if (deleteLoteState.error) {
      toast.error(deleteLoteState.error);
    } else if (deleteLoteState.ok) {
      setLotes((prev) => prev.filter((l) => l.id !== deletingLote.id));
      setDeletingLote(null);
      setDeleteConfirmName("");
      toast.success("Lote eliminado correctamente");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteLoteState]);

  useEffect(() => {
    if (!deletingCultivo) return;
    if (deleteCultivoState.error) {
      toast.error(deleteCultivoState.error);
    } else if (deleteCultivoState.ok) {
      setLotes((prev) =>
        prev.map((lote) => ({
          ...lote,
          cultivos: lote.cultivos.filter((c) => c.id !== deletingCultivo.id),
        }))
      );
      setDeletingCultivo(null);
      setDeleteCultivoConfirm("");
      toast.success("Cultivo eliminado");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteCultivoState]);

  useEffect(() => {
    if (!deletingRegistro) return;
    if (deleteRegistroState.error) {
      toast.error(deleteRegistroState.error);
    } else if (deleteRegistroState.ok) {
      setLotes((prev) =>
        prev.map((lote) => ({
          ...lote,
          cultivos: lote.cultivos.map((cultivo) =>
            cultivo.id === deletingRegistro.cultivoId
              ? {
                  ...cultivo,
                  registros: cultivo.registros.filter((r) => r.id !== deletingRegistro.registroId),
                  _count: { ...cultivo._count, registros: cultivo._count.registros - 1 },
                }
              : cultivo
          ),
        }))
      );
      setDeletingRegistro(null);
      toast.success("Registro eliminado correctamente");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleteRegistroState]);

  if (!finca) {
    return (
      <EmptyState
        icon={<Sprout size={28} />}
        title="Sin finca configurada"
        description="Configura tu finca para comenzar el seguimiento de tus cultivos."
        action={<Button>Configurar finca</Button>}
      />
    );
  }

  if (lotes.length === 0) {
    return (
      <div>
        <div className="flex justify-end gap-2 mb-4">
          <Button size="sm" variant="secondary" onClick={() => router.push('/dashboard/mapa?action=draw')}>
            <MapPin size={14} />
            Dibujar en mapa
          </Button>
          <Button size="sm" onClick={() => { setEditingLote(null); setShowLoteModal(true); }}>
            <Plus size={14} />
            Agregar lote
          </Button>
        </div>
        <EmptyState
          icon={<Sprout size={28} />}
          title="Sin lotes registrados"
          description="Agrega lotes a tu finca para comenzar el seguimiento de tus cultivos."
          action={
            <Button onClick={() => { setEditingLote(null); setShowLoteModal(true); }}>
              <Plus size={14} />
              Agregar lote
            </Button>
          }
        />
        <Modal isOpen={showLoteModal} onClose={() => setShowLoteModal(false)} title="Nuevo lote">
          <LoteForm
            fincaId={finca.id}
            lote={null}
            fincaCoords={finca.lat && finca.lng ? { lat: finca.lat, lng: finca.lng } : undefined}
            onSuccess={(newLote) => {
              setLotes((prev) => [...prev, { ...newLote, cultivos: [] } as LoteWithCultivos]);
              setShowLoteModal(false);
              toast.success("Lote creado correctamente");
            }}
            onCancel={() => setShowLoteModal(false)}
          />
        </Modal>
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────

  const handleNuevoRegistro = (cultivoId: string) => {
    setSelectedCultivoId(cultivoId);
    setShowRegistroModal(true);
  };

  const handleRegistroCreado = async () => {
    const cultivoId = selectedCultivoId;
    setShowRegistroModal(false);
    toast.success("Registro creado correctamente");
    if (!cultivoId) return;
    try {
      const res = await fetch(`/api/cultivos/${cultivoId}/registros`);
      if (!res.ok) throw new Error("Fetch failed");
      const { data: registros } = await res.json();
      const sortedRegistros = [...registros].sort(
        (a: RegistroCultivo, b: RegistroCultivo) =>
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      setLotes((prev) =>
        prev.map((lote) => ({
          ...lote,
          cultivos: lote.cultivos.map((c) =>
            c.id === cultivoId
              ? { ...c, registros: sortedRegistros, _count: { ...c._count, registros: sortedRegistros.length } }
              : c
          ),
        }))
      );
    } catch {
      toast.error("No se pudieron actualizar los registros");
    }
  };

  const handleLoteCreated = (newLote: Lote) => {
    setLotes((prev) => [...prev, { ...newLote, cultivos: [] } as LoteWithCultivos]);
    setShowLoteModal(false);
    toast.success("Lote creado correctamente");
  };

  const handleLoteUpdated = (updatedLote: Lote) => {
    setLotes((prev) => prev.map((l) => l.id === updatedLote.id ? { ...l, ...updatedLote } : l));
    setShowLoteModal(false);
    setEditingLote(null);
    toast.success("Lote actualizado correctamente");
  };

  const handleOpenEditLote = (lote: Lote) => { setEditingLote(lote); setShowLoteModal(true); };
  const handleOpenDeleteLote = (lote: LoteWithCultivos) => { setDeletingLote(lote); setDeleteConfirmName(""); };

  // ── Cultivo CRUD handlers ──────────────────────────────

  const handleOpenCreateCultivo = (loteId: string, loteArea: number) => {
    setCultivoModalLoteId(loteId);
    setCultivoModalLoteArea(loteArea);
    setEditingCultivo(null);
    setShowCultivoModal(true);
  };

  const handleOpenEditCultivo = (cultivo: Cultivo, loteArea: number) => {
    setCultivoModalLoteId(cultivo.loteId);
    setCultivoModalLoteArea(loteArea);
    setEditingCultivo(cultivo);
    setShowCultivoModal(true);
  };

  const handleCultivoSuccess = (data: CultivoWithData | Cultivo) => {
    if (editingCultivo) {
      // Update existing cultivo in state
      setLotes((prev) =>
        prev.map((lote) => ({
          ...lote,
          cultivos: lote.cultivos.map((c) =>
            c.id === editingCultivo.id
              ? { ...c, ...data }
              : c
          ),
        }))
      );
    } else {
      // Add new cultivo to the lote
      const newCultivo: CultivoWithData = {
        ...(data as CultivoWithData),
        registros: (data as CultivoWithData).registros ?? [],
        _count: (data as CultivoWithData)._count ?? { registros: 0, gastos: 0 },
      };
      setLotes((prev) =>
        prev.map((lote) =>
          lote.id === cultivoModalLoteId
            ? { ...lote, cultivos: [...lote.cultivos, newCultivo] }
            : lote
        )
      );
    }
    setShowCultivoModal(false);
    setEditingCultivo(null);
  };

  const handleOpenDeleteCultivo = (cultivo: CultivoWithData) => {
    setDeletingCultivo(cultivo);
    setDeleteCultivoConfirm("");
  };

  // ── Registro edit/delete handlers ──────────────────────

  const handleOpenEditRegistro = (registro: RegistroCultivo, cultivoId: string) => {
    setEditingRegistro(registro);
    setEditingRegistroCultivoId(cultivoId);
  };

  const handleEtapaChanged = (cultivoId: string, newEtapa: EtapaCultivo) => {
    setLotes((prev) =>
      prev.map((lote) => ({
        ...lote,
        cultivos: lote.cultivos.map((c) =>
          c.id === cultivoId ? { ...c, etapa: newEtapa } : c
        ),
      }))
    );
  };

  const handleRegistroEditSuccess = (updatedRegistro: RegistroCultivo) => {
    setLotes((prev) =>
      prev.map((lote) => ({
        ...lote,
        cultivos: lote.cultivos.map((cultivo) =>
          cultivo.id === editingRegistroCultivoId
            ? { ...cultivo, registros: cultivo.registros.map((r) => r.id === updatedRegistro.id ? updatedRegistro : r) }
            : cultivo
        ),
      }))
    );
    setEditingRegistro(null);
    setEditingRegistroCultivoId(null);
    toast.success("Registro actualizado correctamente");
  };

  const handleOpenDeleteRegistro = (registroId: string, cultivoId: string) => {
    setDeletingRegistro({ registroId, cultivoId });
  };


  // ── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header with add lote button */}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => router.push('/dashboard/mapa?action=draw')}>
          <MapPin size={14} />
          Dibujar en mapa
        </Button>
        <Button size="sm" onClick={() => { setEditingLote(null); setShowLoteModal(true); }}>
          <Plus size={14} />
          Agregar lote
        </Button>
      </div>

      {lotes.map((lote) => {
        const hasActiveCultivo = lote.cultivos.some((c) => c.estado === "ACTIVO");

        return (
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
                {/* Mapping status chips */}
                <div className="flex items-center gap-2 mt-1.5">
                  {lote.geoJson ? (
                    <>
                      <span className="badge badge-success">Área mapeada ✓</span>
                      <button
                        onClick={() => router.push(`/dashboard/mapa?action=edit&loteId=${lote.id}`)}
                        className="text-[11px] text-agro-400 hover:text-agro-600 font-medium"
                      >
                        Editar área
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="badge badge-neutral">Sin área en mapa</span>
                      <button
                        onClick={() => router.push(`/dashboard/mapa?action=draw&loteId=${lote.id}`)}
                        className="text-[11px] text-agro-400 hover:text-agro-600 font-medium"
                      >
                        Dibujar
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!hasActiveCultivo && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenCreateCultivo(lote.id, lote.areaHa)}
                  >
                    <Plus size={14} />
                    Nuevo cultivo
                  </Button>
                )}
                <button
                  onClick={() => handleOpenEditLote(lote)}
                  className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--surface-page)] transition-colors"
                  aria-label={`Editar lote ${lote.nombre}`}
                >
                  <Pencil size={14} className="text-[var(--text-muted)]" />
                </button>
                <button
                  onClick={() => handleOpenDeleteLote(lote)}
                  className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-negative-50 transition-colors"
                  aria-label={`Eliminar lote ${lote.nombre}`}
                >
                  <Trash2 size={14} className="text-[var(--text-muted)] hover:text-negative-400" />
                </button>
              </div>
            </div>

            {lote.cultivos.length === 0 ? (
              <div className="card p-6 text-center text-[13px] text-[var(--text-muted)]">
                Sin cultivos en este lote.
              </div>
            ) : (
              <div className="space-y-4">
                {lote.cultivos.map((cultivo) => {
                  const dias = daysSince(cultivo.fechaSiembra);

                  return (
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
                              <EtapaSelect
                                cultivoId={cultivo.id}
                                etapa={cultivo.etapa}
                                onChanged={(nuevaEtapa) => handleEtapaChanged(cultivo.id, nuevaEtapa)}
                              />
                            </div>
                            {cultivo.fechaSiembra && (
                              <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                                Siembra: {formatDate(cultivo.fechaSiembra, true)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditCultivo(cultivo, lote.areaHa)}
                            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--surface-page)] transition-colors"
                            aria-label="Editar cultivo"
                          >
                            <Pencil size={14} className="text-[var(--text-muted)]" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteCultivo(cultivo)}
                            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-negative-50 transition-colors"
                            aria-label="Eliminar cultivo"
                          >
                            <Trash2 size={14} className="text-[var(--text-muted)] hover:text-negative-400" />
                          </button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setCompartirCultivo({ id: cultivo.id, label: `${cultivo.especie} ${cultivo.variedad}` })}
                            style={{ minHeight: 44 }}
                          >
                            <Share2 size={14} />
                            Compartir
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setDiagnosticoCultivoId(cultivo.id)} style={{ minHeight: 44 }}>
                            <Sparkles size={14} />
                            Diagnóstico IA
                          </Button>
                          <Button size="sm" onClick={() => handleNuevoRegistro(cultivo.id)} style={{ minHeight: 44 }}>
                            <Plus size={14} />
                            Nuevo registro
                          </Button>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
                        <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
                          <div className="text-[11px] text-[var(--text-muted)] mb-0.5">Plantas</div>
                          <div className="text-[16px] font-semibold text-[var(--text-primary)]">
                            {cultivo.cantidadPlantas ?? "—"}
                          </div>
                        </div>
                        <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
                          <div className="text-[11px] text-[var(--text-muted)] mb-0.5">
                            <ClipboardList size={11} className="inline mr-1" />Registros
                          </div>
                          <div className="text-[16px] font-semibold text-[var(--text-primary)]">
                            {cultivo._count.registros}
                          </div>
                        </div>
                        <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
                          <div className="text-[11px] text-[var(--text-muted)] mb-0.5">
                            <DollarSign size={11} className="inline mr-1" />Gastos
                          </div>
                          <div className="text-[16px] font-semibold text-[var(--text-primary)]">
                            {cultivo._count.gastos}
                          </div>
                        </div>
                        {cultivo.variedad && (
                          <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
                            <div className="text-[11px] text-[var(--text-muted)] mb-0.5">Variedad</div>
                            <div className="text-[13px] font-medium text-[var(--text-primary)]">
                              <span className="badge badge-success text-[10px]">{cultivo.variedad}</span>
                            </div>
                          </div>
                        )}
                        {cultivo.portainjerto && (
                          <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)]">
                            <div className="text-[11px] text-[var(--text-muted)] mb-0.5">Porta-injerto</div>
                            <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                              {cultivo.portainjerto}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Info chips/badges */}
                      {(cultivo.variedad || cultivo.portainjerto || cultivo.distanciaSiembra || cultivo.proveedorMaterial || dias !== null) && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {cultivo.variedad && (
                            <span className="badge badge-neutral text-[11px]">🌱 {cultivo.variedad}</span>
                          )}
                          {cultivo.portainjerto && (
                            <span className="badge badge-neutral text-[11px]">🪨 {cultivo.portainjerto}</span>
                          )}
                          {cultivo.distanciaSiembra && (
                            <span className="badge badge-neutral text-[11px]">📐 {cultivo.distanciaSiembra}</span>
                          )}
                          {cultivo.proveedorMaterial && (
                            <span className="badge badge-neutral text-[11px]">🏪 {cultivo.proveedorMaterial}</span>
                          )}
                          {dias !== null && (
                            <span className="badge badge-neutral text-[11px]">📅 {dias} días desde siembra</span>
                          )}
                        </div>
                      )}

                      {/* Sistema de siembra if available */}
                      {cultivo.sistemaSiembra && (
                        <p className="text-[12px] text-[var(--text-secondary)] mb-3">
                          <span className="font-medium">Sistema:</span> {cultivo.sistemaSiembra}
                        </p>
                      )}

                      {/* Progress bar del ciclo */}
                      {(() => {
                        const ETAPAS = ['PREPARACION','SIEMBRA','ESTABLECIMIENTO','CRECIMIENTO','PRODUCCION','COSECHA'];
                        const etapaIndex = ETAPAS.indexOf(cultivo.etapa);
                        const progreso = Math.round((etapaIndex / 5) * 100);
                        return (
                          <div style={{ marginTop: 8, marginBottom: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>
                              <span>Ciclo del cultivo</span>
                              <span>{progreso}% — Etapa {etapaIndex + 1}/6</span>
                            </div>
                            <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 2 }}>
                              <div style={{ width: `${progreso}%`, height: '100%', background: 'var(--color-brand)', borderRadius: 2, transition: 'width 0.5s ease' }} />
                            </div>
                          </div>
                        );
                      })()}

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
                                className="flex items-start gap-2.5 py-1.5 border-b border-[var(--border-subtle)] last:border-0 group"
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
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span
                                    className="badge text-[10px] font-medium"
                                    style={{
                                      background: TIPO_BADGE_COLORS[r.tipo]?.bg ?? "var(--color-surface-gray)",
                                      color: TIPO_BADGE_COLORS[r.tipo]?.color ?? "var(--color-text-soft)",
                                    }}
                                  >
                                    {r.tipo.replace(/_/g, " ")}
                                  </span>
                                  <button
                                    onClick={() => handleOpenEditRegistro(r, cultivo.id)}
                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--surface-page)] transition-colors opacity-0 group-hover:opacity-100"
                                    aria-label="Editar registro"
                                  >
                                    <Pencil size={14} className="text-[var(--text-muted)]" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenDeleteRegistro(r.id, cultivo.id)}
                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-negative-50 transition-colors opacity-0 group-hover:opacity-100"
                                    aria-label="Eliminar registro"
                                  >
                                    <Trash2 size={14} className="text-[var(--text-muted)] hover:text-negative-400" />
                                  </button>
                                </div>
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

                      {cultivo.observaciones && (
                        <p className="mt-2 text-[12px] text-[var(--text-secondary)] bg-[var(--surface-page)] rounded-[var(--radius-md)] px-3 py-2">
                          🔬 {cultivo.observaciones}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {/* ── Modals ─────────────────────────────────────────── */}

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

      {/* Diagnóstico IA Modal */}
      <Modal
        isOpen={!!diagnosticoCultivoId}
        onClose={() => setDiagnosticoCultivoId(null)}
        title="Diagnóstico por foto"
      >
        {diagnosticoCultivoId && (
          <DiagnosticoForm
            cultivoId={diagnosticoCultivoId}
            onSuccess={() => { setDiagnosticoCultivoId(null); router.refresh(); }}
            onCancel={() => setDiagnosticoCultivoId(null)}
          />
        )}
      </Modal>

      {/* Compartir con comprador (Portal, Fase 4) */}
      <CompartirCultivoModal
        isOpen={!!compartirCultivo}
        onClose={() => setCompartirCultivo(null)}
        cultivoId={compartirCultivo?.id ?? ""}
        cultivoLabel={compartirCultivo?.label ?? ""}
      />

      {/* Cultivo Create/Edit Modal */}
      <Modal
        isOpen={showCultivoModal}
        onClose={() => { setShowCultivoModal(false); setEditingCultivo(null); }}
        title={editingCultivo ? "Editar cultivo" : "Nuevo cultivo"}
        size="lg"
      >
        {cultivoModalLoteId && (
          <CultivoForm
            loteId={cultivoModalLoteId}
            loteAreaHa={cultivoModalLoteArea}
            cultivo={editingCultivo}
            onSuccess={handleCultivoSuccess}
            onCancel={() => { setShowCultivoModal(false); setEditingCultivo(null); }}
          />
        )}
      </Modal>

      {/* Delete Cultivo Confirmation */}
      <Modal
        isOpen={!!deletingCultivo}
        onClose={() => { setDeletingCultivo(null); setDeleteCultivoConfirm(""); }}
        title="Eliminar cultivo"
        size="sm"
      >
        {deletingCultivo && (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--text-secondary)]">
              Esta acción eliminará el cultivo <strong>{deletingCultivo.especie} {deletingCultivo.variedad}</strong> y todos sus registros asociados. Para confirmar, escribe el nombre de la especie:
            </p>
            <Input
              label={`Escribe "${deletingCultivo.especie}" para confirmar`}
              value={deleteCultivoConfirm}
              onChange={(e) => setDeleteCultivoConfirm(e.target.value)}
              placeholder={deletingCultivo.especie}
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => { setDeletingCultivo(null); setDeleteCultivoConfirm(""); }}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={deleteCultivoConfirm !== deletingCultivo.especie}
                loading={deleteCultivoPending}
                onClick={() => startDeleteCultivoTransition(() => deleteCultivoFormAction())}
              >
                Eliminar cultivo
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Lote Create/Edit Modal */}
      <Modal
        isOpen={showLoteModal}
        onClose={() => { setShowLoteModal(false); setEditingLote(null); }}
        title={editingLote ? "Editar lote" : "Nuevo lote"}
      >
        <LoteForm
          fincaId={finca.id}
          lote={editingLote}
          fincaCoords={finca.lat && finca.lng ? { lat: finca.lat, lng: finca.lng } : undefined}
          onSuccess={editingLote ? handleLoteUpdated : handleLoteCreated}
          onCancel={() => { setShowLoteModal(false); setEditingLote(null); }}
        />
      </Modal>

      {/* Delete Lote Confirmation */}
      <Modal
        isOpen={!!deletingLote}
        onClose={() => { setDeletingLote(null); setDeleteConfirmName(""); }}
        title="Eliminar lote"
        size="sm"
      >
        {deletingLote && (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--text-secondary)]">
              Esta acción eliminará el lote <strong>{deletingLote.nombre}</strong> y no se puede deshacer.
              Para confirmar, escribe el nombre exacto del lote:
            </p>
            <Input
              label={`Escribe "${deletingLote.nombre}" para confirmar`}
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={deletingLote.nombre}
            />
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => { setDeletingLote(null); setDeleteConfirmName(""); }}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={deleteConfirmName !== deletingLote.nombre}
                loading={deleteLotePending}
                onClick={() => startDeleteLoteTransition(() => deleteLoteFormAction())}
              >
                Eliminar lote
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Registro Modal */}
      <Modal
        isOpen={!!editingRegistro}
        onClose={() => { setEditingRegistro(null); setEditingRegistroCultivoId(null); }}
        title="Editar registro de actividad"
      >
        {editingRegistro && editingRegistroCultivoId && (
          <RegistroForm
            cultivoId={editingRegistroCultivoId}
            registro={editingRegistro}
            onSuccess={() => {}}
            onEditSuccess={handleRegistroEditSuccess}
            onCancel={() => { setEditingRegistro(null); setEditingRegistroCultivoId(null); }}
          />
        )}
      </Modal>

      {/* Delete Registro Confirmation */}
      <Modal
        isOpen={!!deletingRegistro}
        onClose={() => setDeletingRegistro(null)}
        title="Eliminar registro"
        size="sm"
      >
        {deletingRegistro && (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--text-secondary)]">
              ¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setDeletingRegistro(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                loading={deleteRegistroPending}
                onClick={() => startDeleteRegistroTransition(() => deleteRegistroFormAction())}
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
