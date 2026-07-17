"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Sprout, DollarSign, ClipboardList, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Button, Modal, EmptyState } from "@/components/ui";
import { RegistroForm } from "@/components/cultivos/RegistroForm";
import { ETAPA_LABELS, TIPO_REGISTRO_LABELS, CATEGORIA_LABELS } from "@/types";
import { formatCOP, formatCOPFull, formatDate } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import toast from "react-hot-toast";
import type { Cultivo, Lote, Finca, RegistroCultivo, Gasto, Ingreso, Comprador } from "@prisma/client";

type CultivoWithAll = Cultivo & {
  lote: Lote & { finca: Finca };
  registros: RegistroCultivo[];
  gastos: Gasto[];
  ingresos: (Ingreso & { comprador: Comprador | null })[];
};

interface CultivoDetailProps {
  cultivo: CultivoWithAll;
}

const TIPO_BADGE: Record<string, string> = {
  SIEMBRA: "badge-success",
  RIEGO: "badge-info",
  FERTILIZACION: "badge-warning",
  PODA: "badge-neutral",
  TRATAMIENTO_PLAGAS: "badge-danger",
  COSECHA: "badge-success",
  OBSERVACION: "badge-neutral",
  INSPECCION: "badge-neutral",
  ALERTA: "badge-danger",
};

export function CultivoDetail({ cultivo }: CultivoDetailProps) {
  const [registros, setRegistros] = useState(cultivo.registros);
  const [showModal, setShowModal] = useState(false);
  const [filterTipo, setFilterTipo] = useState("");

  const totalGastos = cultivo.gastos.reduce((s, g) => s + g.monto, 0);
  const totalIngresos = cultivo.ingresos.reduce((s, i) => s + i.monto, 0);
  const diasDesdeSiembra = cultivo.fechaSiembra
    ? differenceInDays(new Date(), new Date(cultivo.fechaSiembra))
    : 0;

  const filteredRegistros = filterTipo
    ? registros.filter((r) => r.tipo === filterTipo)
    : registros;

  const handleRegistroCreado = () => {
    setShowModal(false);
    toast.success("Registro creado");
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/cultivos"
          className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] hover:text-agro-600 transition-colors"
        >
          <ArrowLeft size={14} />
          Mis cultivos
        </Link>
      </div>

      {/* Status card */}
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-agro-50 flex items-center justify-center">
              <Sprout size={24} className="text-agro-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-[18px] font-bold text-[var(--text-primary)]">
                  {cultivo.especie} {cultivo.variedad}
                </h1>
                <span className="badge badge-warning">
                  {ETAPA_LABELS[cultivo.etapa]}
                </span>
              </div>
              <p className="text-[13px] text-[var(--text-muted)]">
                {cultivo.lote.nombre} · {cultivo.lote.finca.nombre}
                {cultivo.lote.altitud && ` · ${cultivo.lote.altitud.toLocaleString()} msnm`}
              </p>
              {cultivo.fechaSiembra && (
                <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                  Siembra: {formatDate(cultivo.fechaSiembra, true)} · {diasDesdeSiembra} días activo
                </p>
              )}
            </div>
          </div>

          <Button onClick={() => setShowModal(true)}>
            <Plus size={14} />
            Nuevo registro
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-[var(--border-subtle)]">
          {[
            { label: "Plantas", value: cultivo.cantidadPlantas?.toLocaleString() ?? "—", icon: Sprout, color: "text-agro-400" },
            { label: "Registros", value: registros.length.toString(), icon: ClipboardList, color: "text-blue-500" },
            { label: "Gastos", value: formatCOP(totalGastos), icon: TrendingDown, color: "text-red-500" },
            { label: "Ingresos", value: formatCOP(totalIngresos), icon: DollarSign, color: "text-agro-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[var(--surface-page)] rounded-[var(--radius-md)] p-3 text-center">
              <Icon size={16} className={`${color} mx-auto mb-1.5`} />
              <div className="text-[15px] font-semibold text-[var(--text-primary)]">{value}</div>
              <div className="text-[11px] text-[var(--text-muted)]">{label}</div>
            </div>
          ))}
        </div>

        {cultivo.notas && (
          <div className="mt-4 p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)] text-[12px] text-[var(--text-secondary)]">
            📝 {cultivo.notas}
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Historial de actividades
            <span className="ml-2 text-[12px] font-normal text-[var(--text-muted)]">
              {filteredRegistros.length} registros
            </span>
          </h2>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="h-8 px-2 text-[12px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TIPO_REGISTRO_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {filteredRegistros.length === 0 ? (
          <EmptyState
            icon={<ClipboardList size={24} />}
            title="Sin registros de actividad"
            description="Registra cada actividad del cultivo para construir el historial agronómico."
            action={<Button onClick={() => setShowModal(true)}>Primer registro</Button>}
          />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {filteredRegistros.map((r) => (
              <div key={r.id} className="flex items-start gap-4 px-5 py-4 hover:bg-[var(--surface-page)] transition-colors">
                <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--surface-page)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ClipboardList size={16} className="text-[var(--text-muted)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`badge text-[10px] ${TIPO_BADGE[r.tipo] ?? "badge-neutral"}`}>
                      {TIPO_REGISTRO_LABELS[r.tipo]}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {formatDate(r.fecha, true)}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                    {r.descripcion}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent expenses */}
      {cultivo.gastos.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)]">
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
              Gastos asociados
            </h2>
            <span className="text-[13px] font-semibold text-red-600">
              Total: {formatCOPFull(totalGastos)}
            </span>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {cultivo.gastos.map((g) => (
              <div key={g.id} className="flex items-center gap-4 px-5 py-3">
                <DollarSign size={14} className="text-red-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[var(--text-primary)] truncate">{g.concepto}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {CATEGORIA_LABELS[g.categoria]} · {formatDate(g.fecha, true)}
                  </div>
                </div>
                <span className="text-[13px] font-semibold text-red-600 flex-shrink-0">
                  {formatCOPFull(g.monto)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nuevo registro de actividad">
        <RegistroForm
          cultivoId={cultivo.id}
          onSuccess={handleRegistroCreado}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </div>
  );
}
