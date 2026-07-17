"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Droplets, DollarSign, Bot } from "lucide-react";
import { Button, Modal, Input, Select, Textarea } from "@/components/ui";
import { CATEGORIA_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { CategoriaGasto } from "@prisma/client";

// ── Types ────────────────────────────────────────────────────────────────────

type CultivoOption = { id: string; lote: { nombre: string }; variedad: string };

// ── Riego Modal ───────────────────────────────────────────────────────────────

interface RiegoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const today = new Date().toISOString().split("T")[0];

function RiegoModal({ isOpen, onClose }: RiegoModalProps) {
  const [cultivos, setCultivos] = useState<CultivoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tipo: "RIEGO" as const,
    descripcion: "",
    fecha: today,
  });

  // Load cultivos once when modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/cultivos")
      .then((r) => r.json())
      .then(({ data }) => {
        if (Array.isArray(data)) setCultivos(data);
      })
      .catch(() => {});
  }, [isOpen]);

  const [cultivoId, setCultivoId] = useState("");

  // Pre-select first cultivo when list loads
  useEffect(() => {
    if (cultivos.length > 0 && !cultivoId) {
      setCultivoId(cultivos[0].id);
    }
  }, [cultivos, cultivoId]);

  const handleClose = () => {
    setForm({ tipo: "RIEGO", descripcion: "", fecha: today });
    setCultivoId("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descripcion.trim() || !cultivoId) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/cultivos/${cultivoId}/registros`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, cultivoId }),
      });

      if (!res.ok) throw new Error();
      toast.success("Riego registrado");
      handleClose();
    } catch {
      toast.error("Error al registrar el riego");
    } finally {
      setLoading(false);
    }
  };

  const cultivoOptions = cultivos.map((c) => ({
    value: c.id,
    label: `${c.lote.nombre} · ${c.variedad}`,
  }));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Registrar riego" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {cultivoOptions.length > 0 ? (
          <Select
            label="Cultivo"
            value={cultivoId}
            onChange={(e) => setCultivoId(e.target.value)}
            options={cultivoOptions}
            placeholder="Seleccionar cultivo..."
          />
        ) : (
          <p className="text-[12px] text-[var(--text-muted)]">Cargando cultivos...</p>
        )}

        <Input
          label="Fecha"
          type="date"
          value={form.fecha}
          max={today}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
        />

        <Textarea
          label="Descripción del riego"
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          placeholder="Ej: Riego por goteo, 3 L/planta. Suelo húmedo."
          rows={3}
          required
        />

        {/* Quick templates */}
        <div>
          <div className="text-[11px] text-[var(--text-muted)] mb-2">Plantillas</div>
          <div className="flex flex-wrap gap-2">
            {[
              "Riego por goteo, 3 L/planta.",
              "Riego por aspersión, 45 min.",
              "Riego manual, suelo seco.",
            ].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, descripcion: t })}
                className="text-[11px] px-2.5 py-1 bg-agro-50 hover:bg-agro-100 text-agro-600 rounded-full border border-agro-100 transition-colors"
              >
                {t.split(",")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading} disabled={!cultivoId}>
            Guardar riego
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Gasto Modal ───────────────────────────────────────────────────────────────

interface GastoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function GastoModal({ isOpen, onClose }: GastoModalProps) {
  const [cultivos, setCultivos] = useState<CultivoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    concepto: "",
    categoria: "INSUMOS" as CategoriaGasto,
    monto: "",
    fecha: today,
    cultivoId: "",
    proveedor: "",
  });

  // Load cultivos once when modal opens
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/cultivos")
      .then((r) => r.json())
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setCultivos(data);
          if (data.length > 0) {
            setForm((f) => ({ ...f, cultivoId: data[0].id }));
          }
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleClose = () => {
    setForm({ concepto: "", categoria: "INSUMOS", monto: "", fecha: today, cultivoId: "", proveedor: "" });
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.concepto || !form.monto) return;
    setLoading(true);

    try {
      const res = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          monto: Number(form.monto),
          cultivoId: form.cultivoId || undefined,
        }),
      });

      if (!res.ok) throw new Error();
      toast.success("Gasto registrado");
      handleClose();
    } catch {
      toast.error("Error al registrar el gasto");
    } finally {
      setLoading(false);
    }
  };

  const cultivoOptions = cultivos.map((c) => ({
    value: c.id,
    label: `${c.lote.nombre} · ${c.variedad}`,
  }));

  const categoriaOptions = Object.entries(CATEGORIA_LABELS).map(([v, l]) => ({
    value: v,
    label: l,
  }));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Registrar gasto" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Concepto del gasto"
          value={form.concepto}
          onChange={(e) => setForm({ ...form, concepto: e.target.value })}
          placeholder="Ej: Fungicida Mancozeb"
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Categoría"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaGasto })}
            options={categoriaOptions}
          />
          <Input
            label="Monto (COP)"
            type="number"
            value={form.monto}
            onChange={(e) => setForm({ ...form, monto: e.target.value })}
            placeholder="0"
            min="0"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fecha"
            type="date"
            value={form.fecha}
            max={today}
            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          />
          {cultivoOptions.length > 0 && (
            <Select
              label="Cultivo"
              value={form.cultivoId}
              onChange={(e) => setForm({ ...form, cultivoId: e.target.value })}
              options={cultivoOptions}
              placeholder="Sin asociar"
            />
          )}
        </div>

        <Input
          label="Proveedor (opcional)"
          value={form.proveedor}
          onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
          placeholder="Nombre del proveedor"
        />

        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            Guardar gasto
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Action items config ───────────────────────────────────────────────────────

const FAB_ACTIONS = [
  {
    id: "agro-ia",
    label: "AgroIA",
    icon: Bot,
    bgClass: "bg-teal-500 hover:bg-teal-600",
    textClass: "text-teal-700",
    badgeBgClass: "bg-teal-50",
  },
  {
    id: "gasto",
    label: "Gasto",
    icon: DollarSign,
    bgClass: "bg-harvest-400 hover:bg-harvest-500",
    textClass: "text-harvest-400",
    badgeBgClass: "bg-amber-50",
  },
  {
    id: "riego",
    label: "Riego",
    icon: Droplets,
    bgClass: "bg-agro-400 hover:bg-agro-600",
    textClass: "text-agro-600",
    badgeBgClass: "bg-agro-50",
  },
] as const;

type ActionId = (typeof FAB_ACTIONS)[number]["id"];

// ── MobileFAB ─────────────────────────────────────────────────────────────────

export function MobileFAB() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<"riego" | "gasto" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close menu on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleAction = (id: ActionId) => {
    setIsOpen(false);
    if (id === "riego") setActiveModal("riego");
    else if (id === "gasto") setActiveModal("gasto");
    else if (id === "agro-ia") router.push("/dashboard/asistente");
  };

  return (
    <>
      {/* FAB container — mobile only */}
      <div
        ref={menuRef}
        className="md:hidden fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3"
        aria-label="Acciones rápidas"
      >
        {/* Mini action menu — animates in from below when open */}
        <div
          role="menu"
          aria-hidden={!isOpen}
          className={cn(
            "flex flex-col items-end gap-2 transition-all duration-200",
            isOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          {FAB_ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                role="menuitem"
                tabIndex={isOpen ? 0 : -1}
                onClick={() => handleAction(action.id)}
                style={{
                  transitionDelay: isOpen ? `${idx * 40}ms` : "0ms",
                }}
                className={cn(
                  "flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-full shadow-lg",
                  "bg-[var(--surface-card)] text-[var(--text-primary)]",
                  "border border-[var(--border-subtle)]",
                  "transition-all duration-200",
                  "hover:shadow-xl active:scale-95",
                  isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                )}
                aria-label={action.label}
              >
                <span
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-white",
                    action.bgClass
                  )}
                >
                  <Icon size={14} aria-hidden="true" />
                </span>
                <span className="text-[13px] font-medium whitespace-nowrap">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main FAB button */}
        <button
          onClick={() => setIsOpen((o) => !o)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Cerrar acciones rápidas" : "Abrir acciones rápidas"}
          className={cn(
            "w-14 h-14 rounded-full shadow-lg flex items-center justify-center",
            "bg-agro-400 hover:bg-agro-600 text-white",
            "transition-all duration-200 active:scale-95",
            "focus:outline-none focus:ring-2 focus:ring-agro-400 focus:ring-offset-2",
            isOpen && "bg-agro-600"
          )}
        >
          <span
            className={cn(
              "transition-transform duration-300",
              isOpen ? "rotate-45" : "rotate-0"
            )}
          >
            {/* Single Plus icon that rotates to become X */}
            <Plus size={24} aria-hidden="true" />
          </span>
        </button>
      </div>

      {/* Modals — rendered outside the FAB container to avoid z-index clipping */}
      <RiegoModal
        isOpen={activeModal === "riego"}
        onClose={() => setActiveModal(null)}
      />
      <GastoModal
        isOpen={activeModal === "gasto"}
        onClose={() => setActiveModal(null)}
      />
    </>
  );
}
