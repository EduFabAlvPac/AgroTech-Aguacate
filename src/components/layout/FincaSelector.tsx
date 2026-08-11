"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Check, MapPin } from "lucide-react";
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

export function FincaSelector({ fincas, fincaActivaId, puedeCrear, collapsed }: FincaSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showCrear, setShowCrear] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
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

  const handleCrear = async () => {
    if (!form.nombre.trim() || !form.municipio.trim() || !form.departamento.trim()) {
      toast.error("Nombre, municipio y departamento son requeridos");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/fincas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al crear la finca");
      await cambiarFinca(json.data.id);
      setShowCrear(false);
      setForm(emptyForm);
      toast.success("Finca creada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear la finca");
    } finally {
      setLoading(false);
    }
  };

  if (!activa) {
    // Sin ninguna finca accesible todavía — solo el dueño puede crear una.
    return puedeCrear ? (
      <>
        {!collapsed && (
          <button
            onClick={() => setShowCrear(true)}
            className="mx-3 my-3 px-3 py-2.5 bg-agro-50 rounded-[var(--radius-md)] border border-dashed border-agro-200 text-left hover:bg-agro-100 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-[12px] text-agro-600 font-medium">
              <Plus size={13} /> Crear tu primera finca
            </div>
          </button>
        )}
        <CrearFincaModal
          isOpen={showCrear}
          onClose={() => setShowCrear(false)}
          form={form}
          setForm={setForm}
          loading={loading}
          onSubmit={handleCrear}
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
            {/* Antes solo se mostraba con >1 finca — con una sola finca el
                cuadro se veía idéntico al texto estático de antes, sin pista
                de que ahora es clickeable. Se muestra siempre que haya algo
                que hacer (cambiar o agregar). */}
            {(fincas.length > 1 || puedeCrear) && (
              <ChevronDown size={14} className={`text-agro-400 flex-shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
            )}
          </div>
        )}
      </button>

      {open && !collapsed && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-[var(--border-default)] rounded-[var(--radius-md)] shadow-lg z-50 py-1 max-h-[260px] overflow-y-auto">
          {fincas.map((f) => (
            <button
              key={f.id}
              onClick={() => cambiarFinca(f.id)}
              disabled={cambiando === f.id}
              className="w-full text-left px-3 py-2 hover:bg-agro-50 transition-colors flex items-center justify-between gap-2 disabled:opacity-50"
            >
              <div className="min-w-0">
                <div className="text-[12px] text-[var(--text-primary)] font-medium truncate">{f.nombre}</div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">{f.municipio}, {f.departamento}</div>
              </div>
              {f.id === fincaActivaId && <Check size={14} className="text-agro-400 flex-shrink-0" />}
            </button>
          ))}
          {puedeCrear && (
            <button
              onClick={() => { setOpen(false); setShowCrear(true); }}
              className="w-full text-left px-3 py-2 hover:bg-agro-50 transition-colors flex items-center gap-1.5 text-[12px] text-agro-600 font-medium border-t border-[var(--border-subtle)] mt-1 pt-2"
            >
              <Plus size={13} /> Agregar finca
            </button>
          )}
        </div>
      )}

      <CrearFincaModal
        isOpen={showCrear}
        onClose={() => setShowCrear(false)}
        form={form}
        setForm={setForm}
        loading={loading}
        onSubmit={handleCrear}
      />
    </div>
  );
}

function CrearFincaModal({
  isOpen, onClose, form, setForm, loading, onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  loading: boolean;
  onSubmit: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agregar finca">
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
        <p className="text-[11px] text-[var(--text-muted)]">
          Podrás dibujar los lotes de esta finca en el mapa después de crearla.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={onSubmit}>Crear finca</Button>
        </div>
      </div>
    </Modal>
  );
}
