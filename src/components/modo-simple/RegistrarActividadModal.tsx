"use client";

import { useState, useTransition, type FormEvent } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { PhotoCapture } from "@/components/ui/PhotoCapture";
import { TIPO_REGISTRO_LABELS } from "@/types";
import type { TipoRegistro } from "@prisma/client";
import { crearRegistro } from "@/app/(dashboard)/dashboard/cultivos/registro-actions";

interface RegistrarActividadModalProps {
  cultivoId: string;
  onClose: () => void;
  onSaved: () => void;
}

const TIPOS_CON_COSTO: TipoRegistro[] = ["FERTILIZACION", "TRATAMIENTO_PLAGAS", "RIEGO", "PODA"];
const today = new Date().toISOString().split("T")[0];

/**
 * Bitácora de campo en modo simple (Fase 5, ADR-006, gap #1 del checkpoint
 * — confirmado agregar, no excluir: es la tarea más básica de un
 * Colaborador de campo). Reutiliza crearRegistro (Fase 1,
 * registro-actions.ts) tal cual, incluida la sincronización bidireccional
 * Cultivos↔Finanzas (costo → gasto automático, cosecha+ingreso → ingreso
 * automático) — misma lógica, sin tocarla.
 *
 * Simplificación deliberada frente al formulario de modo completo
 * (RegistroForm.tsx): una sola foto (no hasta 5) y sin el campo "Producto
 * utilizado" (que en modo completo ni siquiera se envía al Server Action,
 * confirmado leyendo RegistroForm.tsx completo antes de replicarlo — no es
 * una omisión, es no arrastrar un campo ya inerte). Mismo criterio de
 * "modo simple = subconjunto simplificado" ya aplicado en Finanzas/Cultivos.
 *
 * crearRegistro recibe cultivoId como primer argumento — se llama
 * directamente dentro de startTransition (mismo patrón ya usado en
 * actualizarFinca/actualizarCultivo) en vez de bindearlo a useActionState.
 */
export function RegistrarActividadModal({ cultivoId, onClose, onSaved }: RegistrarActividadModalProps) {
  const [tipo, setTipo] = useState<TipoRegistro>("OBSERVACION");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(today);
  const [foto, setFoto] = useState<string | null>(null);
  const [costo, setCosto] = useState("");
  const [ingreso, setIngreso] = useState("");
  const [cantidadKg, setCantidadKg] = useState("");

  const [, startTransition] = useTransition();
  const [guardando, setGuardando] = useState(false);

  const showCosto = TIPOS_CON_COSTO.includes(tipo);
  const showIngreso = tipo === "COSECHA";

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (descripcion.trim().length < 10) {
      toast.error("La descripción debe tener al menos 10 caracteres");
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set("imagenes", JSON.stringify(foto ? [foto] : []));
    setGuardando(true);
    startTransition(async () => {
      const result = await crearRegistro(cultivoId, {}, fd);
      setGuardando(false);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Actividad registrada");
        onSaved();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl p-5 space-y-3"
        style={{ maxWidth: 540, background: "white", maxHeight: "88vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>Registrar actividad</h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={20} style={{ color: "var(--text-muted)" }} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="tipo" value={tipo} />
          <input type="hidden" name="descripcion" value={descripcion.trim()} />
          <input type="hidden" name="fecha" value={fecha} />
          <input type="hidden" name="costo" value={costo} />
          <input type="hidden" name="ingreso" value={ingreso} />
          <input type="hidden" name="cantidadKg" value={cantidadKg} />

          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Tipo de actividad</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoRegistro)}
              className="w-full h-11 px-3 rounded-xl text-[14px]"
              style={{ border: "1px solid var(--border-default)" }}
            >
              {Object.entries(TIPO_REGISTRO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Fecha</label>
            <input
              type="date"
              value={fecha}
              max={today}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full h-11 px-3 rounded-xl text-[14px]"
              style={{ border: "1px solid var(--border-default)" }}
            />
          </div>

          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>¿Qué hiciste? *</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Apliqué fertilizante foliar en todo el lote..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-[14px]"
              style={{ border: "1px solid var(--border-default)" }}
            />
          </div>

          {showCosto && (
            <div className="p-3 rounded-xl space-y-2" style={{ background: "var(--surface-page)" }}>
              <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                💰 Costo (opcional)
              </label>
              <input
                type="number"
                min={0}
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                placeholder="Ej: 85000"
                className="w-full h-10 px-3 rounded-lg text-[13px]"
                style={{ border: "1px solid var(--border-default)", background: "white" }}
              />
              {costo && Number(costo) > 0 && (
                <p className="text-[11px]" style={{ color: "var(--color-brand-dark)" }}>
                  ✅ Se creará un gasto de ${Number(costo).toLocaleString("es-CO")} COP en Finanzas
                </p>
              )}
            </div>
          )}

          {showIngreso && (
            <div className="p-3 rounded-xl space-y-2" style={{ background: "var(--surface-page)" }}>
              <label className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                📥 Ingreso de cosecha (opcional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  value={cantidadKg}
                  onChange={(e) => setCantidadKg(e.target.value)}
                  placeholder="Kg cosechados"
                  className="w-full h-10 px-3 rounded-lg text-[13px]"
                  style={{ border: "1px solid var(--border-default)", background: "white" }}
                />
                <input
                  type="number"
                  min={0}
                  value={ingreso}
                  onChange={(e) => setIngreso(e.target.value)}
                  placeholder="Ingreso COP"
                  className="w-full h-10 px-3 rounded-lg text-[13px]"
                  style={{ border: "1px solid var(--border-default)", background: "white" }}
                />
              </div>
              {ingreso && Number(ingreso) > 0 && (
                <p className="text-[11px]" style={{ color: "var(--color-brand-dark)" }}>
                  ✅ Se creará un ingreso de ${Number(ingreso).toLocaleString("es-CO")} COP en Finanzas
                </p>
              )}
            </div>
          )}

          <div>
            <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Foto (opcional)</label>
            <PhotoCapture onCapture={setFoto} onRemove={() => setFoto(null)} preview={foto} />
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full py-3 rounded-full text-[13px] font-semibold disabled:opacity-60"
            style={{ background: "var(--color-brand)", color: "white" }}
          >
            {guardando ? "Guardando..." : "Guardar actividad"}
          </button>
        </form>
      </div>
    </div>
  );
}
