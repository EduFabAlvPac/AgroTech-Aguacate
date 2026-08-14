"use client";

import { useState, useTransition } from "react";
import { Plus, Phone, Mail, Package, Star, Pencil, Trash2, Users } from "lucide-react";
import { Button, Modal, EmptyState } from "@/components/ui";
import { TIPO_COMPRADOR_LABELS } from "@/types";
import { formatCOPFull } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Comprador } from "@prisma/client";
import { CompradorForm } from "@/components/compradores/CompradorForm";
import { cambiarEstadoComprador, eliminarComprador, type EliminarCompradorState } from "@/app/(dashboard)/dashboard/compradores/comprador-actions";

type CompradorWithCount = Comprador & { _count: { ingresos: number } };

interface CompradoresClientProps {
  compradores: CompradorWithCount[];
  especiesDisponibles?: string[];
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
  "bg-info-50 text-info-600",
  "bg-amber-50 text-[#8A5E20]",
  "bg-brand-50 text-brand-600",
  "bg-positive-50 text-positive-600",
];

export function CompradoresClient({ compradores: initial, especiesDisponibles = [] }: CompradoresClientProps) {
  const [compradores, setCompradores] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [editingComprador, setEditingComprador] = useState<CompradorWithCount | null>(null);
  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroEspecie, setFiltroEspecie] = useState("Todos");
  const [, startTransition] = useTransition();

  const FILTRO_TIPOS = ["Todos", "COOPERATIVA", "EXPORTADOR", "MAYORISTA", "SUPERMERCADO", "PLAZA_MERCADO", "RESTAURANTE", "OTRO"];
  const FILTRO_LABELS: Record<string, string> = {
    "Todos": "Todos", "COOPERATIVA": "Cooperativa", "EXPORTADOR": "Exportador",
    "MAYORISTA": "Mayorista", "SUPERMERCADO": "Supermercado", "PLAZA_MERCADO": "Plaza",
    "RESTAURANTE": "Restaurante", "OTRO": "Otro",
  };

  const compradoresFiltrados = compradores
    .filter((c) => filtroTipo === "Todos" || c.tipo === filtroTipo)
    .filter((c) => filtroEspecie === "Todos" || c.especiesInteres.includes(filtroEspecie));

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  const mejorPrecio = Math.max(
    ...compradores.filter((c) => c.precioKg).map((c) => c.precioKg!),
    0
  );

  const handleOpen = (c?: CompradorWithCount) => {
    setEditingComprador(c ?? null);
    setShowModal(true);
  };

  // Server Action nativa (Fase 1, ADR-006) en vez de fetch DELETE — se
  // llama directamente dentro de startTransition. No se usa el dispatcher
  // de useActionState aquí: el toast de confirmación define su JSX una
  // sola vez dentro de handleDelete y react-hot-toast no lo vuelve a crear
  // en cada render de este componente, así que un dispatcher pre-atado
  // por id quedaría con un closure desactualizado (mismo criterio ya
  // aplicado en Finanzas/Alertas).
  const handleDelete = (id: string) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-[13px]">¿Eliminar este comprador?</span>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            startTransition(async () => {
              const result: EliminarCompradorState = await eliminarComprador({}, id);
              if (result.error) { toast.error(result.error); return; }
              setCompradores((prev) => prev.filter((c) => c.id !== id));
              toast.success("Comprador eliminado");
            });
          }}
          className="px-3 py-1 bg-negative-400 text-white text-[12px] rounded-md font-medium"
        >
          Eliminar
        </button>
        <button
          onClick={() => toast.dismiss(t.id)}
          className="px-3 py-1 border border-[var(--border-default)] text-[12px] rounded-md"
        >
          Cancelar
        </button>
      </div>
    ), { duration: 10000 });
  };

  const handleToggleEstado = (c: CompradorWithCount) => {
    const newEstado = c.estado === "ACTIVO" ? "PROSPECTO" : "ACTIVO";
    startTransition(async () => {
      const result = await cambiarEstadoComprador(c.id, newEstado);
      if (result.error) { toast.error(result.error); return; }
      setCompradores((prev) => prev.map((cp) => (cp.id === c.id ? { ...cp, estado: newEstado } : cp)));
    });
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
              borderColor: filtroTipo === tipo ? "var(--color-brand)" : "var(--border-default)",
              background: filtroTipo === tipo ? "var(--color-brand-bg)" : "transparent",
              color: filtroTipo === tipo ? "var(--color-brand-dark)" : "var(--text-secondary)",
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

      {/* Filter pills — por cultivo de interés (multi-cultivo) */}
      {especiesDisponibles.length > 0 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {["Todos", ...especiesDisponibles].map((especie) => (
            <button
              key={especie}
              onClick={() => setFiltroEspecie(especie)}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                border: "1px solid",
                borderColor: filtroEspecie === especie ? "var(--color-brand)" : "var(--border-default)",
                background: filtroEspecie === especie ? "var(--color-brand-bg)" : "transparent",
                color: filtroEspecie === especie ? "var(--color-brand-dark)" : "var(--text-secondary)",
                fontSize: 11,
                fontWeight: filtroEspecie === especie ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {especie === "Todos" ? "🌱 Todos los cultivos" : especie}
            </button>
          ))}
        </div>
      )}

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
                    className="p-1.5 hover:bg-negative-50 rounded-[var(--radius-md)] text-[var(--text-muted)] hover:text-negative-400 transition-colors"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Type + status */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {mejorPrecio > 0 && c.precioKg === mejorPrecio && (
                  <span style={{ background: 'var(--color-amber-bg)', color: '#8A5E20', fontSize: 10, padding: '2px 6px', borderRadius: 20, fontWeight: 600, border: '1px solid #EDCF85' }}>
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
                {c.especiesInteres.map((especie) => (
                  <span key={especie} className="badge text-[10px]" style={{ background: "var(--color-brand-bg)", color: "var(--color-brand-dark)", border: "1px solid #A0DBC3" }}>
                    {especie}
                  </span>
                ))}
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
        title={editingComprador ? "Editar comprador" : "Nuevo comprador"}
        size="md"
      >
        <CompradorForm
          comprador={editingComprador}
          especiesDisponibles={especiesDisponibles}
          onSuccess={(comprador) => {
            setCompradores((prev) =>
              editingComprador
                ? prev.map((c) => (c.id === comprador.id ? { ...c, ...comprador } : c))
                : [{ ...comprador, _count: { ingresos: 0 } }, ...prev]
            );
            setShowModal(false);
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}
