"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Input, Select, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { COMMODITY_MERCADO_LABELS, TENDENCIA_PRECIO_LABELS } from "@/types";
import type { CommodityMercado, TendenciaPrecio } from "@prisma/client";
import { crearPrecioMercado, eliminarPrecioMercado } from "@/app/(dashboard)/dashboard/admin/precios-mercado/precio-actions";

interface PrecioData {
  id: string;
  commodity: CommodityMercado;
  precioKg: number;
  unidad: string;
  tendencia: TendenciaPrecio;
  fecha: Date;
  creadoPor: { name: string | null; email: string };
}

const TENDENCIA_ICON: Record<TendenciaPrecio, typeof TrendingUp> = {
  SUBIO: TrendingUp,
  BAJO: TrendingDown,
  IGUAL: Minus,
};

const COMMODITY_OPTIONS = (Object.keys(COMMODITY_MERCADO_LABELS) as CommodityMercado[]).map((c) => ({
  value: c,
  label: COMMODITY_MERCADO_LABELS[c],
}));

export function PreciosMercadoClient({ precios: initial }: { precios: PrecioData[] }) {
  const [precios, setPrecios] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ commodity: "CAFE" as CommodityMercado, precioKg: "", unidad: "kg" });
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleCrear = () => {
    if (!form.precioKg) return toast.error("Ingresa el precio");
    setLoading(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("commodity", form.commodity);
        fd.set("precioKg", form.precioKg);
        fd.set("unidad", form.unidad);

        const result = await crearPrecioMercado({}, fd);
        if (result.error || !result.precio) {
          toast.error(result.error || "Error al guardar");
          return;
        }
        setPrecios((prev) => [{ ...result.precio!, creadoPor: { name: "Tú", email: "" } }, ...prev]);
        toast.success("Precio guardado");
        setShowModal(false);
        setForm({ commodity: "CAFE", precioKg: "", unidad: "kg" });
      } finally {
        setLoading(false);
      }
    });
  };

  const handleEliminar = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      try {
        const result = await eliminarPrecioMercado({}, id);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setPrecios((prev) => prev.filter((p) => p.id !== id));
        toast.success("Precio eliminado");
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} /> Cargar precio
        </Button>
      </div>

      {precios.length === 0 ? (
        <EmptyState
          title="Sin precios cargados"
          description="Carga el primer precio de referencia para café, cacao, aguacate o cítricos — lo verán los usuarios del modo Campesino."
          action={<Button onClick={() => setShowModal(true)}><Plus size={14} /> Cargar precio</Button>}
        />
      ) : (
        <div className="space-y-2">
          {precios.map((p) => {
            const Icon = TENDENCIA_ICON[p.tendencia];
            return (
              <div key={p.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {COMMODITY_MERCADO_LABELS[p.commodity]}
                    </span>
                    <span className="text-[13px] text-[var(--text-secondary)]">
                      ${p.precioKg.toLocaleString("es-CO")} / {p.unidad}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-muted)]">
                      <Icon size={13} /> {TENDENCIA_PRECIO_LABELS[p.tendencia]}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {formatDate(p.fecha)} · {p.creadoPor.name ?? p.creadoPor.email}
                  </p>
                </div>
                <button
                  onClick={() => handleEliminar(p.id)}
                  disabled={deletingId === p.id}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-negative-50 transition-colors flex-shrink-0 disabled:opacity-50"
                  aria-label="Eliminar"
                >
                  <Trash2 size={14} className="text-[var(--text-muted)] hover:text-negative-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Cargar precio de mercado" size="sm">
        <div className="space-y-3">
          <Select
            label="Cultivo"
            value={form.commodity}
            onChange={(e) => setForm({ ...form, commodity: e.target.value as CommodityMercado })}
            options={COMMODITY_OPTIONS}
          />
          <Input
            label="Precio por kg (COP)"
            type="number"
            value={form.precioKg}
            onChange={(e) => setForm({ ...form, precioKg: e.target.value })}
            placeholder="8250"
          />
          <Input
            label="Unidad"
            value={form.unidad}
            onChange={(e) => setForm({ ...form, unidad: e.target.value })}
          />
          <p className="text-[11px] text-[var(--text-muted)]">
            La tendencia (subió/bajó/se mantiene) se calcula sola comparando con el último precio cargado de este cultivo.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleCrear}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
