"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldCheck, AlertTriangle, Pencil, Trash2, FileText, Ban, ClipboardList } from "lucide-react";
import { Button, Modal, EmptyState, Input, Select, Textarea } from "@/components/ui";
import toast from "react-hot-toast";
import { RIESGO_LABELS, ESTADO_SINIESTRO_LABELS } from "@/types";
import { formatCOPFull } from "@/lib/utils";
import { vigenciaPoliza, diasParaVencer, type VigenciaPoliza } from "@/lib/seguros";
import type { SegurosResumen, PolizaVista, SiniestroVista } from "@/lib/data/seguros";
import { PolizaForm } from "@/components/seguros/PolizaForm";
import { SiniestroForm } from "@/components/seguros/SiniestroForm";
import { fmtFecha, isoDia, numOrNull } from "@/components/seguros/seguros-util";
import {
  cancelarPoliza,
  eliminarPoliza,
  eliminarSiniestro,
  actualizarSeguimientoSiniestro,
} from "@/app/(dashboard)/dashboard/seguros/seguro-actions";

interface Props {
  resumen: SegurosResumen;
  /** Instante del servidor (ISO): todos los cálculos de vigencia usan ESTE valor, no `new Date()`, para hidratar igual. */
  ahoraISO: string;
  hoy: string;
  fincaNombre?: string;
  puedeGestionarPolizas: boolean;
  puedeReportarSiniestro: boolean;
  puedeEliminar: boolean;
  /** Prefill desde el detalle del cultivo o desde una alerta (?accion=...). */
  prefill?: { accion?: "poliza" | "siniestro"; cultivoId?: string | null; tipo?: string | null; fecha?: string | null };
}

const VIGENCIA_UI: Record<VigenciaPoliza, { label: string; cls: string }> = {
  VIGENTE: { label: "Vigente", cls: "badge-success" },
  POR_VENCER: { label: "Por vencer", cls: "badge-warning" },
  VENCIDA: { label: "Vencida", cls: "badge-danger" },
  CANCELADA: { label: "Cancelada", cls: "badge-neutral" },
  NO_INICIADA: { label: "Aún no inicia", cls: "badge-info" },
};

const ESTADO_SINIESTRO_CLS: Record<string, string> = {
  REGISTRADO: "badge-neutral",
  REPORTADO_ASEGURADORA: "badge-info",
  EN_REVISION: "badge-warning",
  APROBADO: "badge-success",
  PAGADO: "badge-success",
  RECHAZADO: "badge-danger",
};

export function SegurosClient({ resumen, ahoraISO, hoy, fincaNombre, puedeGestionarPolizas, puedeReportarSiniestro, puedeEliminar, prefill }: Props) {
  const router = useRouter();
  const ahora = new Date(ahoraISO);
  const [tab, setTab] = useState<"polizas" | "siniestros">(prefill?.accion === "siniestro" ? "siniestros" : "polizas");
  const [polizaModal, setPolizaModal] = useState<{ abierto: boolean; poliza: PolizaVista | null }>({
    abierto: prefill?.accion === "poliza" && puedeGestionarPolizas,
    poliza: null,
  });
  const [siniestroModal, setSiniestroModal] = useState(prefill?.accion === "siniestro" && puedeReportarSiniestro);
  const [seguimiento, setSeguimiento] = useState<SiniestroVista | null>(null);
  const [, startTransition] = useTransition();

  const { polizas, siniestros, cultivos } = resumen;
  const cerrar = () => {
    setPolizaModal({ abierto: false, poliza: null });
    setSiniestroModal(false);
    setSeguimiento(null);
    router.refresh();
  };

  const avisos = polizas
    .map((p) => ({ p, v: vigenciaPoliza(p, ahora) }))
    .filter((x) => x.v === "POR_VENCER" || (x.v === "VENCIDA" && diasParaVencer(x.p.fechaFin, ahora) > -30));

  const confirmarEliminar = (texto: string, accion: () => Promise<{ error?: string }>) => {
    toast((t) => (
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[13px]">{texto}</span>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            startTransition(async () => {
              const r = await accion();
              if (r.error) return void toast.error(r.error, { duration: 8000 });
              toast.success("Eliminado");
              router.refresh();
            });
          }}
          className="px-3 py-1 bg-negative-400 text-white text-[12px] rounded-md font-medium"
        >
          Eliminar
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1 border border-[var(--border-default)] text-[12px] rounded-md">Cancelar</button>
      </div>
    ), { duration: 10000 });
  };

  return (
    <div className="space-y-5">
      {avisos.length > 0 && (
        <div role="status" className="rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 p-3 text-[13px] text-[#8A5E20] space-y-1">
          {avisos.map(({ p, v }) => (
            <div key={p.id} className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                {v === "VENCIDA"
                  ? `La póliza de ${p.aseguradora} venció el ${fmtFecha(p.fechaFin)}. Renuévala para no quedar sin cobertura.`
                  : `La póliza de ${p.aseguradora} vence en ${Math.max(diasParaVencer(p.fechaFin, ahora), 0)} día(s) (${fmtFecha(p.fechaFin)}).`}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div role="tablist" className="flex gap-1 rounded-[var(--radius-md)] bg-[var(--surface-page)] p-1">
          {([["polizas", `Pólizas (${polizas.length})`], ["siniestros", `Siniestros (${siniestros.length})`]] as const).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 min-h-[40px] rounded-[var(--radius-sm)] text-[13px] transition-colors ${tab === k ? "bg-white shadow-sm font-semibold text-agro-800" : "text-[var(--text-secondary)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "polizas" && puedeGestionarPolizas && (
          <Button onClick={() => setPolizaModal({ abierto: true, poliza: null })}><Plus size={14} /> Registrar póliza</Button>
        )}
        {tab === "siniestros" && puedeReportarSiniestro && (
          <Button onClick={() => setSiniestroModal(true)} disabled={cultivos.length === 0}><Plus size={14} /> Registrar siniestro</Button>
        )}
      </div>

      {tab === "polizas" && (
        polizas.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={28} />}
            title="Aún no registras ningún seguro"
            description="Si contrataste un seguro agrícola contra sequía, lluvias, heladas u otros eventos, regístralo aquí y asócialo a tus cultivos. Si ocurre un siniestro, tendrás todo listo para reclamar."
            action={puedeGestionarPolizas ? <Button onClick={() => setPolizaModal({ abierto: true, poliza: null })}>Registrar mi primera póliza</Button> : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {polizas.map((p) => {
              const v = vigenciaPoliza(p, ahora);
              return (
                <div key={p.id} className="card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[15px] font-semibold text-[var(--text-primary)]">{p.aseguradora}</div>
                      <div className="text-[12px] text-[var(--text-muted)]">{p.numeroPoliza ? `Póliza ${p.numeroPoliza} · ` : ""}{fmtFecha(p.fechaInicio)} → {fmtFecha(p.fechaFin)}</div>
                    </div>
                    <span className={`badge ${VIGENCIA_UI[v].cls}`}>{VIGENCIA_UI[v].label}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {p.riesgos.map((r) => <span key={r} className="badge badge-neutral">{RIESGO_LABELS[r]}</span>)}
                  </div>

                  <div className="text-[12px] text-[var(--text-secondary)]">
                    <span className="font-medium">Cultivos:</span> {p.cultivos.length ? p.cultivos.map((c) => c.nombre).join(" · ") : "—"}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[12px]">
                    <div><div className="text-[var(--text-muted)]">Suma asegurada</div><div className="font-medium">{p.sumaAsegurada != null ? formatCOPFull(p.sumaAsegurada) : "—"}</div></div>
                    <div><div className="text-[var(--text-muted)]">Prima</div><div className="font-medium">{p.prima != null ? formatCOPFull(p.prima) : "—"}</div></div>
                    <div><div className="text-[var(--text-muted)]">Deducible</div><div className="font-medium">{p.deduciblePct != null ? `${p.deduciblePct}%` : "—"}</div></div>
                  </div>
                  {p.contacto && <div className="text-[12px] text-[var(--text-secondary)]"><span className="font-medium">Reclamos:</span> {p.contacto}</div>}

                  <div className="flex items-center justify-between pt-1 border-t border-[var(--border-default)]">
                    <span className="text-[12px] text-[var(--text-muted)]">{p.totalSiniestros} siniestro(s)</span>
                    <div className="flex gap-1">
                      {puedeGestionarPolizas && (
                        <>
                          <button aria-label="Editar póliza" onClick={() => setPolizaModal({ abierto: true, poliza: p })} className="p-2 rounded-md text-[var(--text-muted)] hover:text-agro-600 hover:bg-[var(--surface-page)]"><Pencil size={14} /></button>
                          {p.estado === "ACTIVA" && (
                            <button
                              aria-label="Cancelar póliza"
                              title="Cancelar póliza (conserva el historial)"
                              onClick={() => confirmarEliminar(`¿Cancelar la póliza de ${p.aseguradora}?`, () => cancelarPoliza(p.id))}
                              className="p-2 rounded-md text-[var(--text-muted)] hover:text-amber-700 hover:bg-[var(--surface-page)]"
                            ><Ban size={14} /></button>
                          )}
                        </>
                      )}
                      {puedeEliminar && (
                        <button aria-label="Eliminar póliza" onClick={() => confirmarEliminar(`¿Eliminar la póliza de ${p.aseguradora}?`, () => eliminarPoliza(p.id))} className="p-2 rounded-md text-[var(--text-muted)] hover:text-negative-600 hover:bg-[var(--surface-page)]"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === "siniestros" && (
        siniestros.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={28} />}
            title="Sin siniestros registrados"
            description="Si una sequía, exceso de lluvia, helada o granizo daña un cultivo, regístralo aquí con fotos. GermIA arma el expediente con el clima de esos días para tu reclamo."
            action={puedeReportarSiniestro && cultivos.length > 0 ? <Button onClick={() => setSiniestroModal(true)}>Registrar siniestro</Button> : undefined}
          />
        ) : (
          <div className="space-y-3">
            {siniestros.map((s) => (
              <div key={s.id} className="card p-5 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--text-primary)]">{RIESGO_LABELS[s.tipo]} · {s.cultivoNombre}</div>
                    <div className="text-[12px] text-[var(--text-muted)]">Ocurrió el {fmtFecha(s.fechaEvento)}{s.polizaNombre ? ` · Póliza ${s.polizaNombre}` : " · Sin póliza (evidencia)"}</div>
                  </div>
                  <span className={`badge ${ESTADO_SINIESTRO_CLS[s.estado]}`}>{ESTADO_SINIESTRO_LABELS[s.estado]}</span>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)]">{s.descripcion}</p>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-[var(--text-secondary)]">
                  {s.porcentajeDanio != null && <span>Daño: <b>{s.porcentajeDanio}%</b></span>}
                  {s.areaAfectadaHa != null && <span>Área: <b>{s.areaAfectadaHa} ha</b></span>}
                  {s.perdidaEstimada != null && <span>Pérdida estimada: <b>{formatCOPFull(s.perdidaEstimada)}</b></span>}
                  {s.montoIndemnizado != null && <span>Indemnizado: <b>{formatCOPFull(s.montoIndemnizado)}</b></span>}
                  {s.numeroReclamo && <span>Reclamo: <b>{s.numeroReclamo}</b></span>}
                  <span>{s.totalFotos} foto(s)</span>
                </div>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <a href={`/expediente-siniestro/${s.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-md border border-[var(--border-default)] text-[13px] hover:bg-[var(--surface-page)]">
                    <FileText size={14} /> Expediente (PDF)
                  </a>
                  <Button variant="secondary" size="sm" onClick={() => setSeguimiento(s)} disabled={!puedeGestionarPolizas}>Seguimiento del reclamo</Button>
                  {puedeEliminar && (
                    <button aria-label="Eliminar siniestro" onClick={() => confirmarEliminar("¿Eliminar este siniestro y su evidencia?", () => eliminarSiniestro(s.id))} className="p-2 rounded-md text-[var(--text-muted)] hover:text-negative-600 hover:bg-[var(--surface-page)]"><Trash2 size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Modal isOpen={polizaModal.abierto} onClose={cerrar} title={polizaModal.poliza ? "Editar póliza" : "Registrar póliza"} size="lg">
        {polizaModal.abierto && <PolizaForm cultivos={cultivos} poliza={polizaModal.poliza} cultivoInicial={prefill?.cultivoId} fincaNombre={fincaNombre} onDone={cerrar} />}
      </Modal>

      <Modal isOpen={siniestroModal} onClose={cerrar} title="Registrar siniestro" size="lg">
        {siniestroModal && <SiniestroForm cultivos={cultivos} polizas={polizas} hoy={hoy} inicial={prefill} onDone={cerrar} />}
      </Modal>

      <Modal isOpen={!!seguimiento} onClose={cerrar} title="Seguimiento del reclamo">
        {seguimiento && <SeguimientoForm siniestro={seguimiento} onDone={cerrar} />}
      </Modal>
    </div>
  );
}

function SeguimientoForm({ siniestro, onDone }: { siniestro: SiniestroVista; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<string>(siniestro.estado);
  const [numero, setNumero] = useState(siniestro.numeroReclamo ?? "");
  const [fechaRep, setFechaRep] = useState(isoDia(siniestro.fechaReporteAseguradora));
  const [monto, setMonto] = useState(siniestro.montoIndemnizado != null ? String(siniestro.montoIndemnizado) : "");
  const [notas, setNotas] = useState(siniestro.notas ?? "");
  const [error, setError] = useState("");
  const pagable = estado === "APROBADO" || estado === "PAGADO";

  const guardar = () => {
    setError("");
    const m = numOrNull(monto);
    if (Number.isNaN(m)) return setError("El monto indemnizado debe ser un número.");
    startTransition(async () => {
      const r = await actualizarSeguimientoSiniestro(siniestro.id, {
        estado,
        numeroReclamo: numero || null,
        fechaReporteAseguradora: fechaRep || null,
        montoIndemnizado: pagable ? m : null,
        notas: notas || null,
      });
      if (r.error) return setError(r.error);
      toast.success("Seguimiento actualizado");
      onDone();
    });
  };

  return (
    <div className="space-y-4">
      <Select label="Estado del reclamo" value={estado} onChange={(e) => setEstado(e.target.value)} options={Object.entries(ESTADO_SINIESTRO_LABELS).map(([value, label]) => ({ value, label }))} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input label="Número de reclamo" value={numero} onChange={(e) => setNumero(e.target.value)} />
        <Input label="Fecha en que reportaste" type="date" value={fechaRep} onChange={(e) => setFechaRep(e.target.value)} />
      </div>
      {pagable && <Input label="Monto indemnizado (COP)" type="number" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />}
      <Textarea label="Notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
      {error && <p role="alert" className="text-[13px] text-negative-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDone} disabled={pending}>Cancelar</Button>
        <Button onClick={guardar} loading={pending}>Guardar</Button>
      </div>
    </div>
  );
}
