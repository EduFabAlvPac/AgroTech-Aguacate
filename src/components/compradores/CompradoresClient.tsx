"use client";

import { useState } from "react";
import { Plus, Phone, Mail, Package, Star, Pencil, Trash2, Users } from "lucide-react";
import { Button, Modal, Input, Select, Textarea, EmptyState } from "@/components/ui";
import { TIPO_COMPRADOR_LABELS } from "@/types";
import { formatCOP, formatCOPFull } from "@/lib/utils";
import { compradorFormSchema } from "@/lib/validations";
import toast from "react-hot-toast";
import type { Comprador, TipoComprador } from "@prisma/client";

type CompradorWithCount = Comprador & { _count: { ingresos: number } };

interface CompradoresClientProps {
  compradores: CompradorWithCount[];
}

const TIPO_COLORS: Record<string, string> = {
  COOPERATIVA: "badge-info",
  EXPORTADOR: "badge-warning",
  MAYORISTA: "badge-neutral",
  SUPERMERCADO: "badge-success",
  PLAZA_MERCADO: "badge-neutral",
  RESTAURANTE: "badge-neutral",
  OTRO: "badge-neutral",
};

const AVATAR_COLORS = [
  "bg-blue-50 text-blue-600",
  "bg-amber-50 text-amber-700",
  "bg-teal-50 text-teal-600",
  "bg-purple-50 text-purple-600",
  "bg-green-50 text-green-700",
];

const emptyForm = {
  nombre: "", tipo: "COOPERATIVA" as TipoComprador,
  ciudad: "", departamento: "", contacto: "",
  email: "", telefono: "", capacidadTon: "",
  precioKg: "", notas: "", estado: "ACTIVO",
};

export function CompradoresClient({ compradores: initial }: CompradoresClientProps) {
  const [compradores, setCompradores] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  const FILTRO_TIPOS = ["Todos", "COOPERATIVA", "EXPORTADOR", "MAYORISTA", "SUPERMERCADO", "PLAZA_MERCADO", "RESTAURANTE", "OTRO"];
  const FILTRO_LABELS: Record<string, string> = {
    "Todos": "Todos", "COOPERATIVA": "Cooperativa", "EXPORTADOR": "Exportador",
    "MAYORISTA": "Mayorista", "SUPERMERCADO": "Supermercado", "PLAZA_MERCADO": "Plaza",
    "RESTAURANTE": "Restaurante", "OTRO": "Otro",
  };

  const compradoresFiltrados = filtroTipo === "Todos"
    ? compradores
    : compradores.filter((c) => c.tipo === filtroTipo);

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const mejorPrecio = Math.max(
    ...compradores.filter((c) => c.precioKg).map((c) => c.precioKg!),
    0
  );

  const handleOpen = (c?: CompradorWithCount) => {
    if (c) {
      setEditingId(c.id);
      setForm({
        nombre: c.nombre, tipo: c.tipo, ciudad: c.ciudad,
        departamento: c.departamento ?? "", contacto: c.contacto ?? "",
        email: c.email ?? "", telefono: c.telefono ?? "",
        capacidadTon: c.capacidadTon?.toString() ?? "",
        precioKg: c.precioKg?.toString() ?? "",
        notas: c.notas ?? "", estado: c.estado,
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setErrors({});
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...form,
      capacidadTon: form.capacidadTon ? Number(form.capacidadTon) : undefined,
      precioKg: form.precioKg ? Number(form.precioKg) : undefined,
    };

    // Zod validation
    const result = compradorFormSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString();
        if (key && !fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    setLoading(true);

    try {
      const url = editingId ? `/api/compradores/${editingId}` : "/api/compradores";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const { data } = await res.json();
      if (!res.ok) throw new Error();

      if (editingId) {
        setCompradores((prev) =>
          prev.map((c) => (c.id === editingId ? { ...c, ...data } : c))
        );
        toast.success("Comprador actualizado");
      } else {
        setCompradores((prev) => [{ ...data, _count: { ingresos: 0 } }, ...prev]);
        toast.success("Comprador creado");
      }

      setShowModal(false);
    } catch {
      toast.error("Error al guardar el comprador");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este comprador?")) return;
    try {
      await fetch(`/api/compradores/${id}`, { method: "DELETE" });
      setCompradores((prev) => prev.filter((c) => c.id !== id));
      toast.success("Comprador eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const handleToggleEstado = async (c: CompradorWithCount) => {
    const newEstado = c.estado === "ACTIVO" ? "PROSPECTO" : "ACTIVO";
    try {
      await fetch(`/api/compradores/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...c, estado: newEstado }),
      });
      setCompradores((prev) =>
        prev.map((cp) => (cp.id === c.id ? { ...cp, estado: newEstado } : cp))
      );
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge badge-neutral">{compradores.length} contactos</span>
          <span className="badge badge-success">
            {compradores.filter((c) => c.estado === "ACTIVO").length} activos
          </span>
        </div>
        <Button onClick={() => handleOpen()}>
          <Plus size={14} />
          Nuevo comprador
        </Button>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {FILTRO_TIPOS.map((tipo) => (
          <button
            key={tipo}
            onClick={() => setFiltroTipo(tipo)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: "1px solid",
              borderColor: filtroTipo === tipo ? "#639922" : "var(--border-default)",
              background: filtroTipo === tipo ? "#EAF3DE" : "transparent",
              color: filtroTipo === tipo ? "#3B6D11" : "var(--text-secondary)",
              fontSize: 12,
              fontWeight: filtroTipo === tipo ? 600 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            {FILTRO_LABELS[tipo]}
          </button>
        ))}
      </div>

      {/* Grid */}
      {compradoresFiltrados.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="Sin compradores registrados"
          description="Agrega tus primeros contactos de compra para construir tu red comercial."
          action={<Button onClick={() => handleOpen()}>Agregar comprador</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {compradoresFiltrados.map((c, i) => (
            <div key={c.id} className="card p-5 hover:shadow-card-hover transition-shadow">
              {/* Card header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                    {initials(c.nombre)}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[var(--text-primary)] leading-tight">
                      {c.nombre}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {c.ciudad}{c.departamento && `, ${c.departamento}`}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleOpen(c)}
                    className="p-1.5 hover:bg-[var(--surface-page)] rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-agro-600 transition-colors"
                    aria-label="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 hover:bg-red-50 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-red-500 transition-colors"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Type + status */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {mejorPrecio > 0 && c.precioKg === mejorPrecio && (
                  <span style={{ background: '#FEF9E7', color: '#B7950B', fontSize: 10, padding: '2px 6px', borderRadius: 20, fontWeight: 600, border: '1px solid #F9E79F' }}>
                    ⭐ Mejor precio
                  </span>
                )}
                <span className={`badge ${TIPO_COLORS[c.tipo]} text-[10px]`}>
                  {TIPO_COMPRADOR_LABELS[c.tipo]}
                </span>
                <button
                  onClick={() => handleToggleEstado(c)}
                  className={`badge text-[10px] cursor-pointer transition-colors ${
                    c.estado === "ACTIVO" ? "badge-success" : "badge-warning"
                  }`}
                >
                  {c.estado}
                </button>
              </div>

              {/* Details */}
              <div className="space-y-2">
                {c.precioKg && (
                  <div className="flex items-center gap-2">
                    <Star size={12} className="text-harvest-200 flex-shrink-0" />
                    <span className="text-[12px] text-agro-600 font-semibold">
                      {formatCOPFull(c.precioKg)}/kg
                    </span>
                    {c.capacidadTon && (
                      <span className="text-[11px] text-[var(--text-muted)]">
                        · Cap. {c.capacidadTon} t/mes
                      </span>
                    )}
                  </div>
                )}
                {c.telefono && (
                  <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                    <Phone size={12} className="flex-shrink-0 text-[var(--text-muted)]" />
                    {c.telefono}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                    <Mail size={12} className="flex-shrink-0 text-[var(--text-muted)]" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.contacto && (
                  <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                    <Package size={12} className="flex-shrink-0 text-[var(--text-muted)]" />
                    {c.contacto}
                  </div>
                )}
                {c._count.ingresos > 0 && (
                  <div className="text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                    {c._count.ingresos} ventas registradas
                  </div>
                )}
              </div>

              {c.notas && (
                <p className="mt-3 text-[11px] text-[var(--text-muted)] bg-[var(--surface-page)] rounded-[var(--radius-md)] px-2.5 py-1.5 line-clamp-2">
                  {c.notas}
                </p>
              )}
            </div>
          ))}

          {/* Add CTA card */}
          <button
            onClick={() => handleOpen()}
            className="min-h-[200px] border-2 border-dashed border-[var(--border-default)] rounded-[var(--radius-lg)] flex flex-col items-center justify-center gap-2 hover:border-agro-200 hover:bg-agro-50 transition-all text-[var(--text-muted)] hover:text-agro-400"
          >
            <Plus size={22} />
            <span className="text-[13px]">Agregar comprador</span>
          </button>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Editar comprador" : "Nuevo comprador"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input
                label="Nombre o razón social"
                value={form.nombre}
                onChange={(e) => {
                  setForm({ ...form, nombre: e.target.value });
                  if (errors.nombre) setErrors((prev) => ({ ...prev, nombre: undefined! }));
                }}
                placeholder="Ej: CoopAgroNS"
                error={errors.nombre}
              />
            </div>
            <Select
              label="Tipo"
              value={form.tipo}
              onChange={(e) => {
                setForm({ ...form, tipo: e.target.value as TipoComprador });
                if (errors.tipo) setErrors((prev) => ({ ...prev, tipo: undefined! }));
              }}
              options={Object.entries(TIPO_COMPRADOR_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              error={errors.tipo}
            />
            <Select
              label="Estado"
              value={form.estado}
              onChange={(e) => {
                setForm({ ...form, estado: e.target.value });
                if (errors.estado) setErrors((prev) => ({ ...prev, estado: undefined! }));
              }}
              options={[
                { value: "ACTIVO", label: "Activo" },
                { value: "PROSPECTO", label: "Prospecto" },
                { value: "INACTIVO", label: "Inactivo" },
              ]}
              error={errors.estado}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Ciudad"
              value={form.ciudad}
              onChange={(e) => {
                setForm({ ...form, ciudad: e.target.value });
                if (errors.ciudad) setErrors((prev) => ({ ...prev, ciudad: undefined! }));
              }}
              placeholder="Cúcuta"
              error={errors.ciudad}
            />
            <Input
              label="Departamento"
              value={form.departamento}
              onChange={(e) => {
                setForm({ ...form, departamento: e.target.value });
                if (errors.departamento) setErrors((prev) => ({ ...prev, departamento: undefined! }));
              }}
              placeholder="Norte de Santander"
              error={errors.departamento}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Precio/kg (COP)"
              type="number"
              value={form.precioKg}
              onChange={(e) => {
                setForm({ ...form, precioKg: e.target.value });
                if (errors.precioKg) setErrors((prev) => ({ ...prev, precioKg: undefined! }));
              }}
              placeholder="3200"
              error={errors.precioKg}
            />
            <Input
              label="Capacidad (ton/mes)"
              type="number"
              value={form.capacidadTon}
              onChange={(e) => {
                setForm({ ...form, capacidadTon: e.target.value });
                if (errors.capacidadTon) setErrors((prev) => ({ ...prev, capacidadTon: undefined! }));
              }}
              placeholder="10"
              error={errors.capacidadTon}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Teléfono"
              value={form.telefono}
              onChange={(e) => {
                setForm({ ...form, telefono: e.target.value });
                if (errors.telefono) setErrors((prev) => ({ ...prev, telefono: undefined! }));
              }}
              placeholder="+57 300 000 0000"
              error={errors.telefono}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined! }));
              }}
              placeholder="contacto@empresa.co"
              error={errors.email}
            />
          </div>

          <Input
            label="Persona de contacto"
            value={form.contacto}
            onChange={(e) => {
              setForm({ ...form, contacto: e.target.value });
              if (errors.contacto) setErrors((prev) => ({ ...prev, contacto: undefined! }));
            }}
            placeholder="Nombre del contacto"
            error={errors.contacto}
          />

          <Textarea
            label="Notas"
            value={form.notas}
            onChange={(e) => {
              setForm({ ...form, notas: e.target.value });
              if (errors.notas) setErrors((prev) => ({ ...prev, notas: undefined! }));
            }}
            placeholder="Condiciones de compra, horarios, requisitos especiales..."
            rows={2}
            error={errors.notas}
          />

          <div className="flex gap-3 justify-end pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading}>
              {editingId ? "Guardar cambios" : "Crear comprador"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
