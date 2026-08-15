"use client";

import { useActionState, useEffect, useState, useTransition, type ReactNode, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Home, MapPin, Plus, Pencil, Trash2, X, Ruler, Mountain, Navigation } from "lucide-react";
import toast from "react-hot-toast";
import type { FincaResumen } from "@/lib/data/fincas";
import {
  crearFinca,
  actualizarFinca,
  eliminarFinca,
  type FincaActionState,
} from "@/app/(dashboard)/dashboard/fincas/finca-actions";

interface MisFincasSimpleClientProps {
  fincas: FincaResumen[];
}

const initialState: FincaActionState = {};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 rounded-full text-[13px] font-semibold disabled:opacity-60"
      style={{ background: "var(--color-brand)", color: "white" }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function MisFincasSimpleClient({ fincas }: MisFincasSimpleClientProps) {
  const router = useRouter();
  const [showNueva, setShowNueva] = useState(false);
  const [editando, setEditando] = useState<FincaResumen | null>(null);
  const [, startTransition] = useTransition();
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const eliminar = (finca: FincaResumen) => {
    if (!window.confirm(`¿Eliminar la finca "${finca.nombre}"? Esta acción no se puede deshacer.`)) return;
    setEliminandoId(finca.id);
    startTransition(async () => {
      const result = await eliminarFinca({}, finca.id);
      setEliminandoId(null);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Finca eliminada");
        router.refresh();
      }
    });
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* ── Header + Nueva ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>Mis fincas</h2>
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {fincas.length} finca{fincas.length === 1 ? "" : "s"} registrada{fincas.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={() => setShowNueva(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-semibold flex-shrink-0"
          style={{ background: "var(--color-brand-bg)", color: "var(--color-brand-dark)" }}
        >
          <Plus size={14} /> Nueva
        </button>
      </div>

      {/* ── Lista / vacío ── */}
      {fincas.length === 0 ? (
        <div className="rounded-2xl px-4 py-10 text-center" style={{ background: "var(--surface-page)" }}>
          <Home size={28} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
          <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>Aún no tienes fincas registradas</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>Toca &quot;+ Nueva&quot; para registrar la primera.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fincas.map((f) => (
            <FincaCard
              key={f.id}
              finca={f}
              eliminando={eliminandoId === f.id}
              onEditar={() => setEditando(f)}
              onEliminar={() => eliminar(f)}
            />
          ))}
        </div>
      )}

      {/* ── Modales: nueva / editar ── */}
      {showNueva && (
        <FincaModal
          titulo="Nueva finca"
          onClose={() => setShowNueva(false)}
          onSaved={() => {
            setShowNueva(false);
            router.refresh();
          }}
        />
      )}
      {editando && (
        <FincaModal
          titulo="Editar finca"
          finca={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function Badge({ icon, texto }: { icon: ReactNode; texto: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-1 rounded-full"
      style={{ background: "var(--surface-page)", color: "var(--text-secondary)" }}
    >
      {icon} {texto}
    </span>
  );
}

function FincaCard({
  finca,
  eliminando,
  onEditar,
  onEliminar,
}: {
  finca: FincaResumen;
  eliminando: boolean;
  onEditar: () => void;
  onEliminar: () => void;
}) {
  const tieneCoords = finca.lat != null && finca.lng != null;
  const tieneBadges = finca.areaTotal != null || finca.altitud != null || tieneCoords;

  return (
    <div className="rounded-2xl p-4" style={{ border: "1px solid var(--border-subtle)" }}>
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--color-brand-bg)" }}
          >
            <Home size={16} style={{ color: "var(--color-brand)" }} />
          </div>
          <div className="text-[14px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{finca.nombre}</div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEditar} aria-label="Editar finca" disabled={eliminando} className="p-1.5">
            <Pencil size={15} style={{ color: "var(--text-muted)" }} />
          </button>
          <button onClick={onEliminar} aria-label="Eliminar finca" disabled={eliminando} className="p-1.5">
            <Trash2 size={15} style={{ color: eliminando ? "var(--text-muted)" : "var(--color-negative)" }} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[12px] mb-2.5" style={{ color: "var(--text-secondary)" }}>
        <MapPin size={12} /> {finca.municipio}, {finca.departamento}
      </div>

      {tieneBadges && (
        <div className="flex flex-wrap gap-1.5">
          {finca.areaTotal != null && <Badge icon={<Ruler size={11} />} texto={`${finca.areaTotal} ha`} />}
          {finca.altitud != null && <Badge icon={<Mountain size={11} />} texto={`${finca.altitud} m`} />}
          {tieneCoords && <Badge icon={<Navigation size={11} />} texto={`${finca.lat!.toFixed(2)}, ${finca.lng!.toFixed(2)}`} />}
        </div>
      )}
    </div>
  );
}

function FincaModal({
  titulo,
  finca,
  onClose,
  onSaved,
}: {
  titulo: string;
  finca?: FincaResumen;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(finca?.nombre ?? "");
  const [municipio, setMunicipio] = useState(finca?.municipio ?? "");
  const [departamento, setDepartamento] = useState(finca?.departamento ?? "");
  const [areaTotal, setAreaTotal] = useState(finca?.areaTotal?.toString() ?? "");
  const [altitud, setAltitud] = useState(finca?.altitud?.toString() ?? "");
  const [lat, setLat] = useState(finca?.lat?.toString() ?? "");
  const [lng, setLng] = useState(finca?.lng?.toString() ?? "");

  // Crear: crearFinca no recibe id — se usa useActionState directamente,
  // igual que crearCultivo en la pantalla Cultivos.
  const [createState, createAction] = useActionState(crearFinca, initialState);
  useEffect(() => {
    if (finca) return; // este efecto es solo para el modo "crear"
    if (createState.error) toast.error(createState.error);
    if (createState.finca) {
      toast.success("Finca creada");
      onSaved();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createState]);

  // Editar: actualizarFinca recibe el id como primer argumento. Se llama
  // directamente dentro de startTransition (mismo patrón ya usado para
  // eliminarFinca/cambiarEtapaCultivo) en vez de bindearlo a useActionState,
  // para no repetir el bug de closure obsoleto detectado y evitado en
  // Finanzas durante esta misma fase.
  const [, startTransition] = useTransition();
  const [guardando, setGuardando] = useState(false);

  const handleEditarSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!finca) return;
    if (!nombre.trim() || !municipio.trim() || !departamento.trim()) {
      toast.error("Nombre, municipio y departamento son requeridos");
      return;
    }
    const fd = new FormData(e.currentTarget);
    setGuardando(true);
    startTransition(async () => {
      const result = await actualizarFinca(finca.id, {}, fd);
      setGuardando(false);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Finca actualizada");
        onSaved();
      }
    });
  };

  const campos = (
    <>
      <div>
        <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Nombre *</label>
        <input
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Finca La Esperanza"
          className="w-full h-11 px-3 rounded-xl text-[14px]"
          style={{ border: "1px solid var(--border-default)" }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Municipio *</label>
          <input
            name="municipio"
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            placeholder="Ej: Ocaña"
            className="w-full h-11 px-3 rounded-xl text-[14px]"
            style={{ border: "1px solid var(--border-default)" }}
          />
        </div>
        <div>
          <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Departamento *</label>
          <input
            name="departamento"
            value={departamento}
            onChange={(e) => setDepartamento(e.target.value)}
            placeholder="Ej: Norte de Santander"
            className="w-full h-11 px-3 rounded-xl text-[14px]"
            style={{ border: "1px solid var(--border-default)" }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Área (ha)</label>
          <input
            name="areaTotal"
            type="number"
            step="0.01"
            min={0}
            value={areaTotal}
            onChange={(e) => setAreaTotal(e.target.value)}
            placeholder="Ej: 5"
            className="w-full h-11 px-3 rounded-xl text-[14px]"
            style={{ border: "1px solid var(--border-default)" }}
          />
        </div>
        <div>
          <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Altitud (m)</label>
          <input
            name="altitud"
            type="number"
            min={0}
            value={altitud}
            onChange={(e) => setAltitud(e.target.value)}
            placeholder="Ej: 1800"
            className="w-full h-11 px-3 rounded-xl text-[14px]"
            style={{ border: "1px solid var(--border-default)" }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Latitud</label>
          <input
            name="lat"
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Ej: 8.2417"
            className="w-full h-11 px-3 rounded-xl text-[14px]"
            style={{ border: "1px solid var(--border-default)" }}
          />
        </div>
        <div>
          <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Longitud</label>
          <input
            name="lng"
            type="number"
            step="0.000001"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="Ej: -73.35"
            className="w-full h-11 px-3 rounded-xl text-[14px]"
            style={{ border: "1px solid var(--border-default)" }}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl p-5 space-y-4"
        style={{ maxWidth: 540, background: "white", maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>{titulo}</h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={20} style={{ color: "var(--text-muted)" }} /></button>
        </div>

        {finca ? (
          <form onSubmit={handleEditarSubmit} className="space-y-3">
            {campos}
            <button
              type="submit"
              disabled={guardando}
              className="w-full py-3 rounded-full text-[13px] font-semibold disabled:opacity-60"
              style={{ background: "var(--color-brand)", color: "white" }}
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </form>
        ) : (
          <form
            action={createAction}
            onSubmit={(e) => {
              if (!nombre.trim() || !municipio.trim() || !departamento.trim()) {
                e.preventDefault();
                toast.error("Nombre, municipio y departamento son requeridos");
              }
            }}
            className="space-y-3"
          >
            {campos}
            <SubmitButton label="Crear finca" pendingLabel="Guardando..." />
          </form>
        )}
      </div>
    </div>
  );
}
