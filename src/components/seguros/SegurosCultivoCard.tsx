import Link from "next/link";
import { ShieldCheck, ShieldAlert, Plus } from "lucide-react";
import { RIESGO_LABELS, ESTADO_SINIESTRO_LABELS } from "@/types";
import { vigenciaPoliza } from "@/lib/seguros";
import { fmtFecha } from "@/components/seguros/seguros-util";
import type { getSegurosDeCultivo } from "@/lib/data/seguros";

type Datos = Awaited<ReturnType<typeof getSegurosDeCultivo>>;

const VIG: Record<string, { label: string; cls: string }> = {
  VIGENTE: { label: "Vigente", cls: "badge-success" },
  POR_VENCER: { label: "Por vencer", cls: "badge-warning" },
  VENCIDA: { label: "Vencida", cls: "badge-danger" },
  CANCELADA: { label: "Cancelada", cls: "badge-neutral" },
  NO_INICIADA: { label: "Aún no inicia", cls: "badge-info" },
};

/** Tarjeta del detalle de un cultivo: su seguro y sus siniestros (componente de servidor, solo lectura + enlaces). */
export function SegurosCultivoCard({ cultivoId, datos, puedeAsociar, puedeReportar }: { cultivoId: string; datos: Datos; puedeAsociar: boolean; puedeReportar: boolean }) {
  const ahora = new Date();
  const { polizas, siniestros } = datos;
  const sinCobertura = !polizas.some((p) => ["VIGENTE", "POR_VENCER"].includes(vigenciaPoliza(p, ahora)));

  return (
    <div className="card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] gap-2 flex-wrap">
        <h2 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
          {sinCobertura ? <ShieldAlert size={16} className="text-amber-600" /> : <ShieldCheck size={16} className="text-agro-600" />}
          Seguro de este cultivo
        </h2>
        <div className="flex gap-2">
          {puedeAsociar && (
            <Link href={`/dashboard/seguros?accion=poliza&cultivoId=${cultivoId}` as never} className="inline-flex items-center gap-1 min-h-[36px] px-3 rounded-md border border-[var(--border-default)] text-[12px] hover:bg-[var(--surface-page)]">
              <Plus size={12} /> Asociar seguro
            </Link>
          )}
          {puedeReportar && (
            <Link href={`/dashboard/seguros?accion=siniestro&cultivoId=${cultivoId}` as never} className="inline-flex items-center gap-1 min-h-[36px] px-3 rounded-md border border-[var(--border-default)] text-[12px] hover:bg-[var(--surface-page)]">
              <Plus size={12} /> Registrar siniestro
            </Link>
          )}
        </div>
      </div>

      <div className="p-5 space-y-3 text-[13px]">
        {polizas.length === 0 ? (
          <p className="text-[var(--text-muted)]">Este cultivo no tiene un seguro asociado. Si contrataste uno, asócialo para tener el reclamo listo ante un evento climático.</p>
        ) : (
          polizas.map((p) => {
            const v = vigenciaPoliza(p, ahora);
            return (
              <div key={p.id} className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{p.aseguradora}{p.numeroPoliza ? ` · ${p.numeroPoliza}` : ""}</div>
                  <div className="text-[12px] text-[var(--text-muted)]">{fmtFecha(p.fechaInicio)} → {fmtFecha(p.fechaFin)} · {p.riesgos.map((r) => RIESGO_LABELS[r]).join(", ")}</div>
                </div>
                <span className={`badge ${VIG[v].cls}`}>{VIG[v].label}</span>
              </div>
            );
          })
        )}

        {siniestros.length > 0 && (
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <div className="text-[12px] font-medium text-[var(--text-secondary)] mb-1">Siniestros ({siniestros.length})</div>
            {siniestros.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-[12px] py-0.5">
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
