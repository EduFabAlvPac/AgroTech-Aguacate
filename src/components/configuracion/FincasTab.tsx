"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Pencil, Trash2, Check, Home } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input, Modal, EmptyState } from "@/components/ui";
import type { FincaResumen } from "@/lib/data/fincas";
import { crearFinca, actualizarFinca, eliminarFinca } from "@/app/(dashboard)/dashboard/fincas/finca-actions";

/**
 * Pestaña "Finca" de Configuración — reemplaza al formulario de una sola
 * finca implícita que había antes (hallazgo del usuario, 2026-09-21: no
 * dejaba ver/crear/eliminar las demás, aunque la cuenta ya soporta varias).
 *
 * No es backend nuevo: reusa crearFinca/actualizarFinca/eliminarFinca de
 * src/app/(dashboard)/dashboard/fincas/finca-actions.ts, las mismas Server
 * Actions que ya usa "Mis fincas" (modo Simple) — con su autorización
 * (gate de OWNER para crear/eliminar) y sus protecciones (no borrar la
 * última finca ni una con lotes) ya resueltas ahí. Y POST /api/fincas/activa
 * para elegir con cuál se está trabajando, igual que el selector del
 * sidebar (FincaSelector.tsx) — ambos escriben la misma cookie.
 */
interface FincasTabProps {
  fincas: FincaResumen[];
  fincaActivaId: string | null;
  puedeCrear: boolean;
}

const emptyForm = { nombre: "", municipio: "", departamento: "", altitud: "", areaTotal: "", lat: "", lng: "" };
type FincaFormState = typeof emptyForm;

export function FincasTab({ fincas, fincaActivaId, puedeCrear }: FincasTabProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<FincaResumen | null>(null);
  const [form, setForm] = useState<FincaFormState>(emptyForm);
  const [guardando, setGuardando] = useState(false);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<FincaResumen | null>(null);
  const [eliminandoLoading, setEliminandoLoading] = useState(false);

  const abrirCrear = () => {
    setForm(emptyForm);
    setEditando(null);
    setShowForm(true);
  };

  const abrirEditar = (f: FincaResumen) => {
    setForm({
      nombre: f.nombre,
      municipio: f.municipio,
      departamento: f.departamento,
      altitud: f.altitud?.toString() ?? "",
      areaTotal: f.areaTotal?.toString() ?? "",
      lat: f.lat?.toString() ?? "",
      lng: f.lng?.toString() ?? "",
    });
    setEditando(f);
    setShowForm(true);
  };

  const cambiarActiva = async (fincaId: string, opts?: { silencioso?: boolean }) => {
    setCambiando(fincaId);
    try {
      const res = await fetch("/api/fincas/activa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fincaId }),
      });
      if (!res.ok) throw new Error();
      if (!opts?.silencioso) {
        toast.success("Ahora estás trabajando en esta finca");
        router.refresh();
      }
    } catch {
      toast.error("No se pudo cambiar de finca");
    } finally {
      setCambiando(null);
    }
  };

  const guardar = () => {
    if (!form.nombre.trim() || !form.municipio.trim() || !form.departamento.trim()) {
      toast.error("Nombre, municipio y departamento son requeridos");
      return;
    }
    setGuardando(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("nombre", form.nombre);
        fd.set("municipio", form.municipio);
        fd.set("departamento", form.departamento);
        fd.set("altitud", form.altitud);
        fd.set("areaTotal", form.areaTotal);
        fd.set("lat", form.lat);
        fd.set("lng", form.lng);

        const result = editando ? await actualizarFinca(editando.id, {}, fd) : await crearFinca({}, fd);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(editando ? "Finca actualizada" : "Finca creada");
        setShowForm(false);
        setEditando(null);
        // La primera finca de la cuenta queda como activa de una vez — sin
        // esto, "crear tu primera finca" dejaría la cookie de finca activa
        // vacía y el resto de la app (Mapa, Cultivos) no tendría de dónde partir.
        if (!editando && result.finca && !fincaActivaId) {
          await cambiarActiva(result.finca.id, { silencioso: true });
        }
        router.refresh();
      } finally {
        setGuardando(false);
      }
    });
  };

  const confirmarEliminar = () => {
    if (!eliminando) return;
    setEliminandoLoading(true);
    startTransition(async () => {
      try {
        const result = await eliminarFinca({}, eliminando.id);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Finca eliminada");
        setEliminando(null);
        router.refresh();
      } finally {
        setEliminandoLoading(false);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Tus fincas</h2>
          <p className="text-[12px] text-[var(--text-muted)]">
            {fincas.length === 0
              ? "Todavía no tienes ninguna registrada"
              : `${fincas.length} finca${fincas.length === 1 ? "" : "s"} registrada${fincas.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {puedeCrear && fincas.length > 0 && (
          <Button size="sm" onClick={abrirCrear}>
            <Plus size={15} /> Agregar finca
          </Button>
        )}
      </div>

      {fincas.length === 0 ? (
        <EmptyState
          icon={<MapPin size={22} />}
          title="Crea tu primera finca"
          description={
            puedeCrear
              ? "Registra los datos de tu finca para empezar a gestionar lotes y cultivos."
              : "Todavía no tienes ninguna finca registrada — pídele al dueño de la organización que cree una."
          }
          action={
            puedeCrear ? (
              <Button onClick={abrirCrear}>
                <Plus size={15} /> Crear tu primera finca
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {fincas.map((f) => {
            const activa = f.id === fincaActivaId;
            return (
              <div
                key={f.id}
                className={`card p-4 flex items-center justify-between gap-3 ${activa ? "border-agro-300" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{f.nombre}</span>
                    {activa && (
                      <span className="text-[10px] font-semibold text-agro-600 bg-agro-50 border border-agro-100 rounded-full px-2 py-0.5 flex items-center gap-1 flex-shrink-0">
                        <Check size={10} /> Activa
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[var(--text-muted)] truncate">
                    {f.municipio}, {f.departamento}
                    {f.areaTotal ? ` · ${f.areaTotal} ha` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!activa && (
                    <Button variant="secondary" size="sm" loading={cambiando === f.id} onClick={() => cambiarActiva(f.id)}>
                      <Home size={13} /> Usar esta
                    </Button>
                  )}
                  {puedeCrear && (
                    <>
                      <button
                        onClick={() => abrirEditar(f)}
                        className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--surface-page)] transition-colors"
                        aria-label={`Editar ${f.nombre}`}
                        title="Editar"
                      >
                        <Pencil size={14} className="text-[var(--text-muted)]" />
                      </button>
                      {fincas.length > 1 && (
                        <button
                          onClick={() => setEliminando(f)}
                          className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-negative-50 transition-colors"
                          aria-label={`Eliminar ${f.nombre}`}
                          title="Eliminar"
                        >
                          <Trash2 size={14} className="text-[var(--text-muted)] hover:text-negative-400" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editando ? "Editar finca" : "Agregar finca"}>
        <div className="space-y-3">
          <Input
            label="Nombre *"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            placeholder="Finca Álvarez Pacheco"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Municipio *"
              value={form.municipio}
              onChange={(e) => setForm({ ...form, municipio: e.target.value })}
              placeholder="Ocaña"
            />
            <Input
              label="Departamento *"
              value={form.departamento}
              onChange={(e) => setForm({ ...form, departamento: e.target.value })}
              placeholder="Norte de Santander"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Latitud"
              type="number"
              step="0.0001"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              placeholder="8.320589"
            />
            <Input
              label="Longitud"
              type="number"
              step="0.0001"
              value={form.lng}
              onChange={(e) => setForm({ ...form, lng: e.target.value })}
              placeholder="-73.337551"
            />
            <Input
              label="Área total (ha)"
              type="number"
              step="0.1"
              value={form.areaTotal}
              onChange={(e) => setForm({ ...form, areaTotal: e.target.value })}
            />
          </div>
          <Input
            label="Altitud (msnm)"
            type="number"
            value={form.altitud}
            onChange={(e) => setForm({ ...form, altitud: e.target.value })}
          />
          <div className="p-3 bg-agro-50 rounded-[var(--radius-md)] text-[12px] text-agro-600">
            💡 Las coordenadas GPS se usan para el mapa interactivo y las alertas climáticas. Puedes obtenerlas
            desde Google Maps haciendo clic derecho en tu finca.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button loading={guardando} onClick={guardar}>
              {editando ? "Guardar cambios" : "Crear finca"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!eliminando} onClose={() => setEliminando(null)} title="Eliminar finca" size="sm">
        {eliminando && (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--text-secondary)]">
              ¿Eliminar <strong>{eliminando.nombre}</strong>? Esta acción no se puede deshacer. Solo se puede eliminar
              una finca que ya no tenga lotes, cultivos, gastos, ingresos ni presupuestos; si los tiene, te diremos
              cuáles son.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setEliminando(null)}>
                Cancelar
              </Button>
              <Button variant="danger" loading={eliminandoLoading} onClick={confirmarEliminar}>
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
