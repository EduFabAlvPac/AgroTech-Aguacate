"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Power, PowerOff, Star } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Modal, Input, Select, EmptyState } from "@/components/ui";
import { CATEGORIA_PRODUCTO_LABELS } from "@/types";
import type { CategoriaProducto } from "@prisma/client";
import {
  crearProductoTienda,
  toggleActivoProductoTienda,
  eliminarProductoTienda,
} from "@/app/(dashboard)/dashboard/admin/productos-tienda/producto-actions";

interface ProductoData {
  id: string;
  categoria: CategoriaProducto;
  nombre: string;
  precio: number | null;
  unidadPrecio: string | null;
  imagenUrl: string | null;
  urlExterna: string;
  destacado: boolean;
  activo: boolean;
}

const CATEGORIA_OPTIONS = (Object.keys(CATEGORIA_PRODUCTO_LABELS) as CategoriaProducto[]).map((c) => ({
  value: c,
  label: CATEGORIA_PRODUCTO_LABELS[c],
}));

const emptyForm = {
  categoria: "FERTILIZANTES" as CategoriaProducto,
  nombre: "",
  precio: "",
  unidadPrecio: "",
  imagenUrl: "",
  urlExterna: "",
  destacado: false,
};

export function ProductosTiendaClient({ productos: initial }: { productos: ProductoData[] }) {
  const [productos, setProductos] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleCrear = () => {
    if (!form.nombre.trim()) return toast.error("El nombre es requerido");
    if (!form.urlExterna.trim()) return toast.error("El enlace a CrecIAgro es requerido");
    setLoading(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("categoria", form.categoria);
        fd.set("nombre", form.nombre);
        fd.set("precio", form.precio);
        fd.set("unidadPrecio", form.unidadPrecio);
        fd.set("imagenUrl", form.imagenUrl);
        fd.set("urlExterna", form.urlExterna);
        fd.set("destacado", String(form.destacado));

        const result = await crearProductoTienda({}, fd);
        if (result.error || !result.producto) {
          toast.error(result.error || "Error al guardar");
          return;
        }
        setProductos((prev) => [result.producto! as ProductoData, ...prev]);
        toast.success("Producto agregado");
        setShowModal(false);
        setForm(emptyForm);
      } finally {
        setLoading(false);
      }
    });
  };

  const handleToggle = (p: ProductoData) => {
    setTogglingId(p.id);
    const nuevoActivo = !p.activo;
    startTransition(async () => {
      try {
        const result = await toggleActivoProductoTienda(p.id, nuevoActivo);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setProductos((prev) => prev.map((x) => (x.id === p.id ? { ...x, activo: nuevoActivo } : x)));
        toast.success(nuevoActivo ? "Producto visible en la tienda" : "Producto ocultado");
      } finally {
        setTogglingId(null);
      }
    });
  };

  const handleEliminar = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      try {
        const result = await eliminarProductoTienda({}, id);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setProductos((prev) => prev.filter((p) => p.id !== id));
        toast.success("Producto eliminado");
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} /> Agregar producto
        </Button>
      </div>

      {productos.length === 0 ? (
        <EmptyState
          title="Sin productos cargados"
          description="Agrega insumos (fertilizantes, semillas, equipos...) para el catálogo informativo del modo Campesino. Cada uno enlaza a CrecIAgro."
          action={<Button onClick={() => setShowModal(true)}><Plus size={14} /> Agregar producto</Button>}
        />
      ) : (
        <div className="space-y-2">
          {productos.map((p) => (
            <div key={p.id} className={`card p-4 flex items-center justify-between gap-3 flex-wrap ${!p.activo ? "opacity-60" : ""}`}>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">{p.nombre}</span>
                  <span className="badge text-[10px] font-medium rounded-full px-2 py-0.5" style={{ background: "var(--color-brand-bg)", color: "var(--color-brand-dark)" }}>
                    {CATEGORIA_PRODUCTO_LABELS[p.categoria]}
                  </span>
                  {p.destacado && <Star size={12} className="text-harvest-400" fill="currentColor" />}
                  {!p.activo && (
                    <span className="badge text-[10px] font-medium rounded-full px-2 py-0.5" style={{ background: "var(--color-surface-gray)", color: "var(--color-text-soft)" }}>
                      Oculto
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {p.precio != null && `$${p.precio.toLocaleString("es-CO")}${p.unidadPrecio ? ` · ${p.unidadPrecio}` : ""} · `}
                  {p.urlExterna}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggle(p)}
                  disabled={togglingId === p.id}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-harvest-50 transition-colors flex-shrink-0 disabled:opacity-50"
                  aria-label={p.activo ? "Ocultar" : "Mostrar"}
                  title={p.activo ? "Ocultar" : "Mostrar"}
                >
                  {p.activo ? <PowerOff size={14} className="text-[var(--text-muted)] hover:text-harvest-400" /> : <Power size={14} className="text-[var(--text-muted)] hover:text-agro-500" />}
                </button>
                <button
                  onClick={() => handleEliminar(p.id)}
                  disabled={deletingId === p.id}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-negative-50 transition-colors flex-shrink-0 disabled:opacity-50"
                  aria-label="Eliminar"
                >
                  <Trash2 size={14} className="text-[var(--text-muted)] hover:text-negative-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Agregar producto">
        <div className="space-y-3">
          <Select
            label="Categoría"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaProducto })}
            options={CATEGORIA_OPTIONS}
          />
          <Input label="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Fertilizante 20-20-20" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Precio (COP)" type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="120000" />
            <Input label="Unidad" value={form.unidadPrecio} onChange={(e) => setForm({ ...form, unidadPrecio: e.target.value })} placeholder="Saco x 50 kg" />
          </div>
          <Input label="Imagen (URL)" value={form.imagenUrl} onChange={(e) => setForm({ ...form, imagenUrl: e.target.value })} placeholder="https://..." />
          <Input label="Enlace a CrecIAgro *" value={form.urlExterna} onChange={(e) => setForm({ ...form, urlExterna: e.target.value })} placeholder="https://crecagro.co/producto/..." />
          <label className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
            <input type="checkbox" checked={form.destacado} onChange={(e) => setForm({ ...form, destacado: e.target.checked })} />
            Producto destacado
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleCrear}>Agregar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
