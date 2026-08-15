"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Calendar, ClipboardList, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { ETAPA_LABELS, TIPO_REGISTRO_LABELS } from "@/types";
import { formatDate } from "@/lib/utils";
import type { CropTimelineData } from "@/lib/data/dashboard";
import { eliminarRegistro } from "@/app/(dashboard)/dashboard/cultivos/registro-actions";
import { RegistrarActividadModal } from "@/components/modo-simple/RegistrarActividadModal";
import { ConfirmSheet } from "@/components/modo-simple/ConfirmSheet";

interface RegistroSimple {
  id: string;
  tipo: keyof typeof TIPO_REGISTRO_LABELS;
  descripcion: string;
  fecha: Date | string;
  imagenes: string[];
}

interface CultivoDetalleSimpleClientProps {
  cultivo: {
    id: string;
    especie: string;
    variedad: string | null;
    etapa: keyof typeof ETAPA_LABELS;
    fechaSiembra: Date | string | null;
    cantidadPlantas: number | null;
    lote: { nombre: string; finca: { nombre: string } };
    registros: RegistroSimple[];
  };
  timeline: CropTimelineData;
}

/**
 * Detalle/bitácora de un cultivo en modo simple (Fase 5, ADR-006, gaps #1
 * y #2 del checkpoint — confirmados agregar a modo simple, no excluir).
 * Reutiliza getCultivoDetalle (extraída tal cual de donde vivía inline en
 * el page.tsx de modo completo) y eliminarRegistro/crearRegistro (Fase 1)
 * sin tocar su lógica. Simplificado a propósito frente a CultivoDetail.tsx
 * (modo completo): sin las tablas de gastos/ingresos vinculados — esa
 * información ya vive en la pantalla de Finanzas, no se duplica aquí.
 */
export function CultivoDetalleSimpleClient({ cultivo, timeline }: CultivoDetalleSimpleClientProps) {
  const router = useRouter();
  const [mostrarModal, setMostrarModal] = useState(false);
  const [, startTransition] = useTransition();
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  const nombreCompleto = cultivo.variedad ? `${cultivo.especie} ${cultivo.variedad}` : cultivo.especie;

  const eliminar = (registroId: string) => {
    setConfirmandoId(null);
    setEliminandoId(registroId);
    startTransition(async () => {
      const result = await eliminarRegistro(registroId, {});
      setEliminandoId(null);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Registro eliminado");
        router.refresh();
      }
    });
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* ── Encabezado ── */}
      <div>
        <h1 className="text-[18px] font-extrabold" style={{ color: "var(--text-primary)" }}>{nombreCompleto}</h1>
        <p className="text-[12.5px]" style={{ color: "var(--text-muted)" }}>
          {cultivo.lote.finca.nombre} · {cultivo.lote.nombre} · {ETAPA_LABELS[cultivo.etapa]}
        </p>
      </div>

      {/* ── Progreso del ciclo ── */}
      {timeline.progreso > 0 && (
        <div className="rounded-2xl p-4" style={{ border: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center justify-between text-[12px] mb-1.5" style={{ color: "var(--text-muted)" }}>
            <span>Progreso del ciclo</span>
            <span className="font-semibold">{Math.round(timeline.progreso)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: "var(--surface-page)" }}>
            <div className="h-full rounded-full" style={{ width: `${timeline.progreso}%`, background: "var(--color-amber)" }} />
          </div>
          {timeline.fechaCosechaEst && (
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--text-secondary)" }}>
              <Calendar size={12} /> Cosecha estimada: {timeline.fechaCosechaEst.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
            </div>
          )}
        </div>
      )}

      {/* ── Registrar actividad (gap #1) ── */}
      <button
        onClick={() => setMostrarModal(true)}
        className="w-full flex items-center justify-center gap-1.5 py-3 rounded-full text-[13px] font-semibold"
        style={{ background: "var(--color-brand)", color: "white" }}
      >
        <Plus size={15} /> Registrar actividad
      </button>

      {/* ── Bitácora (gap #2) ── */}
      <div>
        <div className="flex items-center gap-1.5 mb-2.5">
          <ClipboardList size={15} style={{ color: "var(--text-primary)" }} />
          <h2 className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>
            Bitácora · {cultivo.registros.length}
          </h2>
        </div>

        {cultivo.registros.length === 0 ? (
          <div className="rounded-2xl px-4 py-8 text-center" style={{ background: "var(--surface-page)" }}>
            <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>Sin actividades registradas</p>
            <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>Toca &quot;Registrar actividad&quot; para anotar la primera.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cultivo.registros.map((r) => (
              <div key={r.id} className="rounded-2xl p-3.5" style={{ border: "1px solid var(--border-subtle)" }}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex-1 min-w-0">
                    <span
                      className="inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-full mb-1"
                      style={{ background: "var(--color-brand-bg)", color: "var(--color-brand-dark)" }}
                    >
                      {TIPO_REGISTRO_LABELS[r.tipo]}
                    </span>
                    <p className="text-[13px]" style={{ color: "var(--text-primary)" }}>{r.descripcion}</p>
                    <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{formatDate(r.fecha, true)}</p>
                  </div>
                  <button
                    onClick={() => setConfirmandoId(r.id)}
                    disabled={eliminandoId === r.id}
                    aria-label="Eliminar registro"
                    className="p-1 flex-shrink-0"
                  >
                    <Trash2 size={14} style={{ color: eliminandoId === r.id ? "var(--text-muted)" : "var(--color-negative)" }} />
                  </button>
                </div>
                {r.imagenes[0] && (
                  // eslint-disable-next-line @next/next/no-img-element -- mismo patrón que el resto de modo simple
                  <img src={r.imagenes[0]} alt="Evidencia" className="w-full max-w-[180px] rounded-xl mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {mostrarModal && (
        <RegistrarActividadModal
          cultivoId={cultivo.id}
          onClose={() => setMostrarModal(false)}
          onSaved={() => { setMostrarModal(false); router.refresh(); }}
        />
      )}

      {confirmandoId && (
        <ConfirmSheet
          titulo="¿Eliminar este registro?"
          mensaje="Esta acción no se puede deshacer."
          onConfirm={() => eliminar(confirmandoId)}
          onCancel={() => setConfirmandoId(null)}
        />
      )}
    </div>
  );
}
