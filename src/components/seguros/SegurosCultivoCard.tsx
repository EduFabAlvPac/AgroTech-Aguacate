"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldAlert, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { Select } from "@/components/ui";
import { RIESGO_LABELS, ESTADO_SINIESTRO_LABELS } from "@/types";
import { vigenciaPoliza } from "@/lib/seguros";
import { fmtFecha } from "@/components/seguros/seguros-util";
import { asociarPolizaACultivo, quitarPolizaDeCultivo } from "@/app/(dashboard)/dashboard/seguros/seguro-actions";
import type { getSegurosDeCultivo } from "@/lib/data/seguros";

type Datos = Awaited<ReturnType<typeof getSegurosDeCultivo>>;

const VIG: Record<string, { label: string; cls: string }> = {
  VIGENTE: { label: "Vigente", cls: "badge-success" },
  POR_VENCER: { label: "Por vencer", cls: "badge-warning" },
  VENCIDA: { label: "Vencida", cls: "badge-danger" },
  CANCELADA: { label: "Cancelada", cls: "badge-neutral" },
  NO_INICIADA: { label: "Aún no inicia", cls: "badge-info" },
};

interface Props {
  cultivoId: string;
  datos: Datos;
  puedeAsociar: boolean;
  puedeReportar: boolean;
  /** Instante del servidor (ISO): evita desfase de hidratación en las etiquetas de vigencia. */
  ahoraISO: string;
}

/** Tarjeta del detalle de un cultivo: marcarlo como asegurado (póliza existente o nueva) y ver sus siniestros. */
export function SegurosCultivoCard({ cultivoId, datos, puedeAsociar, puedeReportar, ahoraISO }: Props) {
  const router = useRouter();
  const ahora = new Date(ahoraISO);
  const { polizas, siniestros, disponibles } = datos;
  const [elegida, setElegida] = useState("");
  const [pending, startTransition] = useTransition();
  const sinCobertura = !polizas.some((p) => ["VIGENTE", "POR_VENCER"].includes(vigenciaPoliza(p, ahora)));

  const asociar = () => {
    if (!elegida) return;
    startTransition(async () => {
      const r = await asociarPolizaACultivo(elegida, cultivoId);
      if (r.error) return void toast.error(r.error, { duration: 7000 });
      toast.success("Cultivo asegurado con esa póliza");
      setElegida("");
      router.refresh();
    });
  };

  const quitar = (polizaId: string) =>
    startTransition(async () => {
      const r = await quitarPolizaDeCultivo(polizaId, cultivoId);
      if (r.error) return void toast.error(r.error, { duration: 7000 });
      toast.success("Póliza quitada de este cultivo");
      router.refresh();
    });

  const btn = "inline-flex items-center gap-1 min-h-[36px] px-3 rounded-md border border-[var(--border-default)] text-[12px] hover:bg-[var(--surface-page)]";

  return (
    <div className="card" id="seguro">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] gap-2 flex-wrap">
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
          {sinCobertura ? <ShieldAlert size={16} className="text-amber-600" /> : <ShieldCheck size={16} className="text-agro-600" />}
          Seguro de este cultivo
          <span className={`badge ${sinCobertura ? "badge-neutral" : "badge-success"}`}>{sinCobertura ? "Sin seguro vigente" : "Asegurado"}</span>
        </h2>
        <div className="flex gap-2">
          {puedeAsociar && (
            <Link href={`/dashboard/seguros?accion=poliza&cultivoId=${cultivoId}` as never} className={btn}>
              <Plus size={12} /> Nueva póliza
            </Link>
          )}
          {puedeReportar && (
            <Link href={`/dashboard/seguros?accion=siniestro&cultivoId=${cultivoId}` as never} className={btn}>
              <Plus size={12} /> Registrar siniestro
            </Link>
          )}
        </div>
      </div>

      <div className="p-5 space-y-3 text-[13px]">
        {polizas.length === 0 ? (
          <p className="text-[var(--text-muted)]">Este cultivo no tiene un seguro asociado. Si ya contrataste uno, asócialo aquí para tener el reclamo listo ante un evento climático.</p>
        ) : (
          polizas.map((p) => {
            const v = vigenciaPoliza(p, ahora);
            return (
              <div key={p.id} className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{p.aseguradora}{p.numeroPoliza ? ` · ${p.numeroPoliza}` : ""}</div>
                  <div className="text-[12px] text-[var(--text-muted)]">{fmtFecha(p.fechaInicio)} → {fmtFecha(p.fechaFin)} · {p.riesgos.map((r) => RIESGO_LABELS[r]).join(", ")}</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`badge ${VIG[v].cls}`}>{VIG[v].label}</span>
                  {puedeAsociar && (
                    <button type="button" aria-label={`Quitar la póliza de ${p.aseguradora} de este cultivo`} title="Quitar de este cultivo" disabled={pending} onClick={() => quitar(p.id)} className="p-2 rounded-md text-[var(--text-muted)] hover:text-negative-600 hover:bg-[var(--surface-page)]">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {puedeAsociar && disponibles.length > 0 && (
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-end gap-2 flex-wrap">
            <div className="min-w-[220px] flex-1">
              <Select
                label="Asociar una póliza que ya registraste"
                value={elegida}
                onChange={(e) => setElegida(e.target.value)}
                placeholder="Elige la póliza"
                options={disponibles.map((d) => ({ value: d.id, label: `${d.aseguradora}${d.numeroPoliza ? ` · ${d.numeroPoliza}` : ""} (hasta ${fmtFecha(d.fechaFin)})` }))}
              />
            </div>
            <button type="button" onClick={asociar} disabled={!elegida || pending} className={`${btn} bg-agro-600 text-white border-agro-600 hover:bg-agro-800 disabled:opacity-60`}>
              Asegurar este cultivo
            </button>
          </div>
        )}

        {siniestros.length > 0 && (
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <div className="text-[12px] font-medium text-[var(--text-secondary)] mb-1">Siniestros ({siniestros.length})</div>
            {siniestros.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-[12px] py-0.5 gap-2">
                <span>{RIESGO_LABELS[s.tipo]} · {fmtFecha(s.fechaEvento)}{s.porcentajeDanio != null ? ` · ${s.porcentajeDanio}% daño` : ""}</span>
                <a href={`/expediente-siniestro/${s.id}`} target="_blank" rel="noopener noreferrer" className="text-agro-600 underline">{ESTADO_SINIESTRO_LABELS[s.estado]} · expediente</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
