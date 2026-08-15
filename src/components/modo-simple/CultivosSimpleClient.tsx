"use client";

import { useActionState, useEffect, useState, useTransition, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Sprout, Plus, MapPin, Calendar, MoreVertical, X, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { ETAPA_LABELS } from "@/types";
import type { EtapaCultivo, EstadoCultivo } from "@prisma/client";
import type { FincaResumen } from "@/lib/data/fincas";
import type { EstadoSalud } from "@/lib/data/cultivos";
import {
  crearCultivo,
  actualizarCultivo,
  eliminarCultivo,
  type CultivoActionState,
} from "@/app/(dashboard)/dashboard/cultivos/cultivo-actions";
import {
  cambiarEtapaCultivo,
  type CambiarEtapaState,
} from "@/app/(dashboard)/dashboard/cultivos/etapa-actions";
import { ConfirmSheet } from "@/components/modo-simple/ConfirmSheet";

export interface CultivoSimpleItem {
  id: string;
  especie: string;
  variedad: string | null;
  etapa: EtapaCultivo;
  estado: EstadoCultivo;
  loteId: string;
  loteNombre: string;
  fincaNombre: string;
  estadoSalud: EstadoSalud;
  fechaCosechaEst: Date | null;
  progreso: number;
  // Ya venían en el mismo getCultivos (Cultivo completo, no un Pick) —
  // faltaba solo mapearlos aquí para poder prellenar el modal de editar.
  fechaSiembra: Date | null;
  cantidadPlantas: number | null;
}

interface CultivosSimpleClientProps {
  fincas: FincaResumen[];
  fincaSeleccionada: string; // id de finca, o "todas"
  items: CultivoSimpleItem[];
  lotesDisponibles: { id: string; nombre: string }[];
}

const initialCultivoState: CultivoActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 rounded-full text-[13px] font-semibold disabled:opacity-60"
      style={{ background: "var(--color-brand)", color: "white" }}
    >
      {pending ? "Guardando..." : "Crear cultivo"}
    </button>
  );
}

export function CultivosSimpleClient({ fincas, fincaSeleccionada, items, lotesDisponibles }: CultivosSimpleClientProps) {
  const router = useRouter();
  const [showNuevo, setShowNuevo] = useState(false);
  const [editando, setEditando] = useState<CultivoSimpleItem | null>(null);

  const totalCultivos = items.length;
  const saludables = items.filter((c) => c.estadoSalud === "saludable").length;
  const requierenAtencion = items.filter((c) => c.estadoSalud === "requiere_atencion").length;

  const cambiarFiltro = (fincaId: string) => {
    const qs = fincaId === "todas" ? "" : `?finca=${fincaId}`;
    router.push(`/modo-simple/cultivos${qs}` as any);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* ── Selector de finca ── */}
      <div className="relative">
        <label className="text-[11px] font-medium block mb-1" style={{ color: "var(--text-muted)" }}>Finca activa</label>
        <select
          value={fincaSeleccionada}
          onChange={(e) => cambiarFiltro(e.target.value)}
          className="w-full h-11 px-3.5 rounded-xl text-[14px] font-semibold appearance-none"
          style={{ border: "1px solid var(--border-default)", color: "var(--text-primary)", background: "white" }}
        >
          <option value="todas">Todas las fincas</option>
          {fincas.map((f) => (
            <option key={f.id} value={f.id}>{f.nombre}</option>
          ))}
        </select>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl px-2 py-3.5 text-center" style={{ border: "1px solid var(--border-subtle)" }}>
          <div className="text-[18px] font-extrabold" style={{ color: "var(--text-primary)" }}>{totalCultivos}</div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Cultivos</div>
        </div>
        <div className="rounded-2xl px-2 py-3.5 text-center" style={{ border: "1px solid var(--border-subtle)" }}>
          <div className="text-[18px] font-extrabold" style={{ color: "var(--color-brand)" }}>{saludables}</div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Saludables</div>
        </div>
        <div className="rounded-2xl px-2 py-3.5 text-center" style={{ border: "1px solid var(--border-subtle)" }}>
          <div className="text-[18px] font-extrabold" style={{ color: "var(--color-amber)" }}>{requierenAtencion}</div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>Requieren atención</div>
        </div>
      </div>

      {/* ── Header + Nuevo ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>Mis cultivos</h2>
        <button
          onClick={() => setShowNuevo(true)}
          disabled={lotesDisponibles.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold disabled:opacity-50"
          style={{ background: "var(--color-brand-bg)", color: "var(--color-brand-dark)" }}
        >
          <Plus size={14} /> Nuevo
        </button>
      </div>

      {/* ── Lista / vacío ── */}
      {items.length === 0 ? (
        <div className="rounded-2xl px-4 py-10 text-center" style={{ background: "var(--surface-page)" }}>
          <Sprout size={28} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
          <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>Sin cultivos todavía</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>
            {lotesDisponibles.length === 0 ? "Registra un lote en Mis fincas antes de crear un cultivo." : "Toca \"+ Nuevo\" para registrar el primero."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <CultivoCard key={c.id} item={c} onEditar={() => setEditando(c)} />
          ))}
        </div>
      )}

      {/* ── Modal: nuevo cultivo ── */}
      {showNuevo && (
        <NuevoCultivoModal
          lotesDisponibles={lotesDisponibles}
          onClose={() => setShowNuevo(false)}
          onCreated={() => { setShowNuevo(false); router.refresh(); }}
        />
      )}

      {/* ── Modal: editar cultivo ── */}
      {editando && (
        <EditarCultivoModal
          item={editando}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); router.refresh(); }}
        />
      )}
    </div>
  );
}

const ESTADO_SALUD_STYLE: Record<EstadoSalud, { label: string; bg: string; color: string }> = {
  saludable: { label: "Saludable", bg: "var(--color-positive-bg)", color: "var(--color-positive)" },
  requiere_atencion: { label: "Requiere atención", bg: "var(--color-amber-bg)", color: "#8A5E20" },
};

function CultivoCard({ item, onEditar }: { item: CultivoSimpleItem; onEditar: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [cambiando, setCambiando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const router = useRouter();
  const salud = ESTADO_SALUD_STYLE[item.estadoSalud];

  const nombreCompleto = item.variedad ? `${item.especie} ${item.variedad}` : item.especie;
  const cosechaLabel = item.fechaCosechaEst
    ? item.fechaCosechaEst.toLocaleDateString("es-CO", { month: "short", year: "numeric" })
    : null;

  const cambiarEtapa = (nuevaEtapa: EtapaCultivo) => {
    setMenuOpen(false);
    setCambiando(true);
    startTransition(async () => {
      const result: CambiarEtapaState = await cambiarEtapaCultivo(item.id, {}, nuevaEtapa);
      if (result.error) toast.error(result.error);
      else toast.success(`Etapa actualizada a ${ETAPA_LABELS[nuevaEtapa]}`);
      setCambiando(false);
    });
  };

  const eliminar = () => {
    setConfirmandoEliminar(false);
    setEliminando(true);
    startTransition(async () => {
      const result = await eliminarCultivo(item.id, {});
      setEliminando(false);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Cultivo eliminado");
        router.refresh();
      }
    });
  };

  return (
    <div className="rounded-2xl p-4 relative" style={{ border: "1px solid var(--border-subtle)" }}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-brand-bg)" }}>
            <Sprout size={16} style={{ color: "var(--color-brand)" }} />
          </div>
          <div>
            <div className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>{nombreCompleto}</div>
            <div className="text-[12px]" style={{ color: "var(--text-muted)" }}>{ETAPA_LABELS[item.etapa]}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEditar} disabled={eliminando} aria-label="Editar cultivo" className="p-1.5">
            <Pencil size={15} style={{ color: "var(--text-muted)" }} />
          </button>
          <button onClick={() => setConfirmandoEliminar(true)} disabled={eliminando} aria-label="Eliminar cultivo" className="p-1.5">
            <Trash2 size={15} style={{ color: eliminando ? "var(--text-muted)" : "var(--color-negative)" }} />
          </button>
          <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} disabled={cambiando || eliminando} aria-label="Más acciones" className="p-1.5">
            <MoreVertical size={16} style={{ color: "var(--text-muted)" }} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-10 rounded-xl overflow-hidden shadow-lg" style={{ background: "white", border: "1px solid var(--border-subtle)", minWidth: 180 }}>
              <div className="px-3 py-2 text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>Cambiar etapa a:</div>
              {(Object.keys(ETAPA_LABELS) as EtapaCultivo[]).filter((e) => e !== item.etapa).map((e) => (
                <button
                  key={e}
                  onClick={() => cambiarEtapa(e)}
                  className="block w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--surface-page)]"
                  style={{ color: "var(--text-primary)" }}
                >
                  {ETAPA_LABELS[e]}
                </button>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

      <span
        className="inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-full mb-2.5"
        style={{ background: salud.bg, color: salud.color }}
      >
        {salud.label}
      </span>

      <div className="flex items-center gap-1.5 text-[12px] mb-1" style={{ color: "var(--text-secondary)" }}>
        <MapPin size={12} /> {item.fincaNombre} · {item.loteNombre}
      </div>

      {cosechaLabel && (
        <div className="flex items-center gap-1.5 text-[12px] mb-2.5" style={{ color: "var(--text-secondary)" }}>
          <Calendar size={12} /> Cosecha: {cosechaLabel}
        </div>
      )}

      {item.progreso > 0 && (
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>
            <span>Progreso del ciclo</span>
            <span className="font-semibold">{Math.round(item.progreso)}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-page)" }}>
            <div className="h-full rounded-full" style={{ width: `${item.progreso}%`, background: "var(--color-amber)" }} />
          </div>
        </div>
      )}

      {confirmandoEliminar && (
        <ConfirmSheet
          titulo={`¿Eliminar "${nombreCompleto}"?`}
          mensaje="Esta acción no se puede deshacer."
          onConfirm={eliminar}
          onCancel={() => setConfirmandoEliminar(false)}
        />
      )}
    </div>
  );
}

function NuevoCultivoModal({
  lotesDisponibles,
  onClose,
  onCreated,
}: {
  lotesDisponibles: { id: string; nombre: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [loteId, setLoteId] = useState(lotesDisponibles[0]?.id ?? "");
  const [especie, setEspecie] = useState("");
  const [variedad, setVariedad] = useState("");
  const [fechaSiembra, setFechaSiembra] = useState("");
  const [cantidadPlantas, setCantidadPlantas] = useState("");

  const [state, formAction] = useActionState(crearCultivo, initialCultivoState);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.cultivo) {
      toast.success("Cultivo registrado");
      onCreated();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl p-5 space-y-4"
        style={{ maxWidth: 540, background: "white", maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>Nuevo cultivo</h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={20} style={{ color: "var(--text-muted)" }} /></button>
        </div>

        <form
          action={formAction}
          onSubmit={(e) => { if (!especie.trim() || !loteId) { e.preventDefault(); toast.error("Lote y especie son requeridos"); } }}
          className="space-y-3"
        >
          <input type="hidden" name="loteId" value={loteId} />
          <input type="hidden" name="especie" value={especie.trim()} />
          <input type="hidden" name="variedad" value={variedad.trim()} />
          <input type="hidden" name="fechaSiembra" value={fechaSiembra} />
          <input type="hidden" name="cantidadPlantas" value={cantidadPlantas} />

          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Lote</label>
            <select
              value={loteId}
              onChange={(e) => setLoteId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl text-[14px]"
              style={{ border: "1px solid var(--border-default)" }}
            >
              {lotesDisponibles.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Especie *</label>
            <input
              value={especie}
              onChange={(e) => setEspecie(e.target.value)}
              placeholder="Ej: Aguacate, Café, Cacao"
              className="w-full h-11 px-3 rounded-xl text-[14px]"
              style={{ border: "1px solid var(--border-default)" }}
            />
          </div>

          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Variedad</label>
            <input
              value={variedad}
              onChange={(e) => setVariedad(e.target.value)}
              placeholder="Ej: Hass, Caturra"
              className="w-full h-11 px-3 rounded-xl text-[14px]"
              style={{ border: "1px solid var(--border-default)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Fecha de siembra</label>
              <input
                type="date"
                value={fechaSiembra}
                onChange={(e) => setFechaSiembra(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-[14px]"
                style={{ border: "1px solid var(--border-default)" }}
              />
            </div>
            <div>
              <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}># Plantas</label>
              <input
                type="number"
                min={0}
                value={cantidadPlantas}
                onChange={(e) => setCantidadPlantas(e.target.value)}
                placeholder="Ej: 160"
                className="w-full h-11 px-3 rounded-xl text-[14px]"
                style={{ border: "1px solid var(--border-default)" }}
              />
            </div>
          </div>

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}

function toDateInputValue(fecha: Date | null): string {
  if (!fecha) return "";
  const d = new Date(fecha);
  return d.toISOString().slice(0, 10);
}

function EditarCultivoModal({
  item,
  onClose,
  onSaved,
}: {
  item: CultivoSimpleItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [especie, setEspecie] = useState(item.especie);
  const [variedad, setVariedad] = useState(item.variedad ?? "");
  const [fechaSiembra, setFechaSiembra] = useState(toDateInputValue(item.fechaSiembra));
  const [cantidadPlantas, setCantidadPlantas] = useState(item.cantidadPlantas?.toString() ?? "");

  // actualizarCultivo recibe el id como primer argumento — se llama
  // directamente dentro de startTransition (mismo patrón ya usado en
  // actualizarFinca de Mis fincas) en vez de bindearlo a useActionState.
  const [, startTransition] = useTransition();
  const [guardando, setGuardando] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!especie.trim()) {
      toast.error("La especie es requerida");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setGuardando(true);
    startTransition(async () => {
      const result = await actualizarCultivo(item.id, {}, fd);
      setGuardando(false);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Cultivo actualizado");
        onSaved();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl p-5 space-y-4"
        style={{ maxWidth: 540, background: "white", maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>Editar cultivo</h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={20} style={{ color: "var(--text-muted)" }} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Especie *</label>
            <input
              name="especie"
              value={especie}
              onChange={(e) => setEspecie(e.target.value)}
              placeholder="Ej: Aguacate, Café, Cacao"
              className="w-full h-11 px-3 rounded-xl text-[14px]"
              style={{ border: "1px solid var(--border-default)" }}
            />
          </div>

          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Variedad</label>
            <input
              name="variedad"
              value={variedad}
              onChange={(e) => setVariedad(e.target.value)}
              placeholder="Ej: Hass, Caturra"
              className="w-full h-11 px-3 rounded-xl text-[14px]"
              style={{ border: "1px solid var(--border-default)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Fecha de siembra</label>
              <input
                name="fechaSiembra"
                type="date"
                value={fechaSiembra}
                onChange={(e) => setFechaSiembra(e.target.value)}
                className="w-full h-11 px-3 rounded-xl text-[14px]"
                style={{ border: "1px solid var(--border-default)" }}
              />
            </div>
            <div>
              <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}># Plantas</label>
              <input
                name="cantidadPlantas"
                type="number"
                min={0}
                value={cantidadPlantas}
                onChange={(e) => setCantidadPlantas(e.target.value)}
                placeholder="Ej: 160"
                className="w-full h-11 px-3 rounded-xl text-[14px]"
                style={{ border: "1px solid var(--border-default)" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full py-3 rounded-full text-[13px] font-semibold disabled:opacity-60"
            style={{ background: "var(--color-brand)", color: "white" }}
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </div>
    </div>
  );
}
