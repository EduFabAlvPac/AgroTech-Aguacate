"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Check, MapPin, Pencil, Trash2 } from "lucide-react";
import { Modal, Input, Button } from "@/components/ui";
import toast from "react-hot-toast";

export interface FincaOption {
  id: string;
  nombre: string;
  municipio: string;
  departamento: string;
  areaTotal: number | null;
}

interface FincaSelectorProps {
  fincas: FincaOption[];
  fincaActivaId: string | null;
  puedeCrear: boolean;
  collapsed: boolean;
}

const emptyForm = { nombre: "", municipio: "", departamento: "", altitud: "", areaTotal: "" };
type FincaFormState = typeof emptyForm;

export function FincaSelector({ fincas, fincaActivaId, puedeCrear, collapsed }: FincaSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showCrear, setShowCrear] = useState(false);
  const [editando, setEditando] = useState<FincaOption | null>(null);
  const [eliminando, setEliminando] = useState<FincaOption | null>(null);
  const [form, setForm] = useState<FincaFormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [cambiando, setCambiando] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const activa = fincas.find((f) => f.id === fincaActivaId) ?? fincas[0];

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const cambiarFinca = async (fincaId: string) => {
    if (fincaId === fincaActivaId) {
      setOpen(false);
      return;
    }
    setCambiando(fincaId);
    try {
      const res = await fetch("/api/fincas/activa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fincaId }),
      });
      if (!res.ok) throw new Error();
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("No se pudo cambiar de finca");
    } finally {
      setCambiando(null);
    }
  };

  const abrirCrear = () => {
    setForm(emptyForm);
    setEditando(null);
    setOpen(false);
    setShowCrear(true);
  };

  const abrirEditar = (f: FincaOption) => {
    setForm({
      nombre: f.nombre,
      municipio: f.municipio,
      departamento: f.departamento,
      altitud: "",
      areaTotal: f.areaTotal?.toString() ?? "",
    });
    setEditando(f);
    setOpen(false);
    setShowCrear(true);
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim() || !form.municipio.trim() || !form.departamento.trim()) {
      toast.error("Nombre, municipio y departamento son requeridos");
      return;
    }
    setLoading(true);
    try {
      const url = editando ? `/api/fincas/${editando.id}` : "/api/fincas";
      const res = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar la finca");
      if (!editando) await cambiarFinca(json.data.id);
      setShowCrear(false);
      setForm(emptyForm);
      setEditando(null);
      toast.success(editando ? "Finca actualizada" : "Finca creada");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar la finca");
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async () => {
    if (!eliminando) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/fincas/${eliminando.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Error al eliminar la finca");
      toast.success("Finca eliminada");
      setEliminando(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar la finca");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!activa) {
    return puedeCrear ? (
      <>
        {!collapsed && (
          <button
            onClick={abrirCrear}
            className="mx-3 my-3 px-3 py-2.5 bg-agro-50 rounded-[var(--radius-md)] border border-dashed border-agro-200 text-left hover:bg-agro-100 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-[12px] text-agro-600 font-medium">
              <Plus size={13} /> Crear tu primera finca
            </div>
          </button>
        )}
        <FincaFormModal
          isOpen={showCrear}
          editando={!!editando}
          onClose={() => setShowCrear(false)}
          form={form}
          setForm={setForm}
          loading={loading}
          onSubmit={handleGuardar}
        />
      </>
    ) : null;
  }

  return (
    <div className="relative mx-3 my-3" ref={ref} suppressHydrationWarning>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full text-left px-3 py-2.5 bg-agro-50 rounded-[var(--radius-md)] border border-agro-100 hover:bg-agro-100 transition-colors ${collapsed ? "flex justify-center" : ""}`}
        title={collapsed ? activa.nombre : undefined}
        suppressHydrationWarning
      >
        {collapsed ? (
          <MapPin size={16} className="text-agro-400" />
        ) : (
          <div className="flex items-start justify-between gap-1.5">
            <div className="min-w-0">
              <div className="text-[11px] text-agro-400 font-medium mb-0.5">Finca activa</div>
              <div className="text-[12px] text-agro-600 font-medium leading-tight truncate">{activa.nombre}</div>
              <div className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">
                {activa.municipio}{activa.areaTotal ? ` · ${activa.areaTotal} ha` : ""}
              </div>
            </div>
            {(fincas.length > 1 || puedeCrear) && (
              <ChevronDown size={14} className={`text-agro-400 flex-shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
            )}
          </div>
        )}
      </button>

      {open && !collapsed && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-[var(--border-default)] rounded-[var(--radius-md)] shadow-lg z-50 py-1 max-h-[320px] overflow-y-auto">
          {fincas.map((f) => (
            <div
              key={f.id}
              className="w-full px-3 py-2 hover:bg-agro-50 transition-colors flex items-center justify-between gap-2"
            >
              <button
                onClick={() => cambiarFinca(f.id)}
                disabled={cambiando === f.id}
                className="min-w-0 flex-1 text-left disabled:opacity-50"
              >
                <div className="text-[12px] text-[var(--text-primary)] font-medium truncate">{f.nombre}</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">{f.municipio}, {f.departamento}</div>
              </button>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {f.id === fincaActivaId && <Check size={14} className="text-agro-400 mr-1" />}
                {puedeCrear && (
                  <>
                    <button
                      onClick={() => abrirEditar(f)}
                      className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-agro-100"
                      aria-label={`Editar ${f.nombre}`}
                      title="Editar"
                    >
                      <Pencil size={12} className="text-[var(--text-muted)] hover:text-agro-500" />
                    </button>
                    <button
                      onClick={() => { setOpen(false); setEliminando(f); }}
                      className="w-6 h-6 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-red-50"
                      aria-label={`Eliminar ${f.nombre}`}
                      title="Eliminar"
                    >
                      <Trash2 size={12} className="text-[var(--text-muted)] hover:text-red-500" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {puedeCrear && (
            <button
              onClick={abrirCrear}
              className="w-full text-left px-3 py-2 hover:bg-agro-50 transition-colors flex items-center gap-1.5 text-[12px] text-agro-600 font-medium border-t border-[var(--border-subtle)] mt-1 pt-2"
            >
              <Plus size={13} /> Agregar finca
            </button>
          )}
        </div>
      )}

      <FincaFormModal
        isOpen={showCrear}
        editando={!!editando}
        onClose={() => { setShowCrear(false); setEditando(null); }}
        form={form}
        setForm={setForm}
        loading={loading}
        onSubmit={handleGuardar}
      />

      {/* Confirmar eliminación */}
      <Modal isOpen={!!eliminando} onClose={() => setEliminando(null)} title="Eliminar finca" size="sm">
        {eliminando && (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--text-secondary)]">
              ¿Eliminar <strong>{eliminando.nombre}</strong>? Esta acción no se puede deshacer. Si la finca tiene lotes
              registrados, primero debes eliminarlos desde Cultivos o el Mapa.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setEliminando(null)}>Cancelar</Button>
              <Button variant="danger" loading={deleteLoading} onClick={handleEliminar}>Eliminar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function FincaFormModal({
  isOpen, editando, onClose, form, setForm, loading, onSubmit,
}: {
  isOpen: boolean;
  editando: boolean;
  onClose: () => void;
  form: FincaFormState;
  setForm: (f: FincaFormState) => void;
  loading: boolean;
  onSubmit: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editando ? "Editar finca" : "Agregar finca"}>
      <div className="space-y-3">
        <Input
          label="Nombre *"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          placeholder="Ej: Finca La Esperanza"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Municipio *"
            value={form.municipio}
            onChange={(e) => setForm({ ...form, municipio: e.target.value })}
            placeholder="Ej: Ocaña"
          />
          <Input
            label="Departamento *"
            value={form.departamento}
            onChange={(e) => setForm({ ...form, departamento: e.target.value })}
            placeholder="Ej: Norte de Santander"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Altitud (msnm)"
            type="number"
            value={form.altitud}
            onChange={(e) => setForm({ ...form, altitud: e.target.value })}
          />
          <Input
            label="Área total (ha)"
            type="number"
            value={form.areaTotal}
            onChange={(e) => setForm({ ...form, areaTotal: e.target.value })}
          />
        </div>
        {!editando && (
          <p className="text-[11px] text-[var(--text-muted)]">
            Podrás dibujar los lotes de esta finca en el mapa después de crearla.
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={onSubmit}>{editando ? "Guardar cambios" : "Crear finca"}</Button>
        </div>
      </div>
    </Modal>
  );
}
