"use client";

import { useState, useTransition } from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input, Modal, EmptyState } from "@/components/ui";
import type { OrganizacionAdmin } from "@/lib/data/organizaciones-admin";
import { extenderTrial, activarPlanColectivo } from "@/app/(dashboard)/dashboard/admin/organizaciones/organizacion-admin-actions";

/**
 * Panel Super Admin de organizaciones (Colectivo/Cooperativa, PR C) — lista
 * de organizaciones con su plan/prueba y las dos acciones de la conversión
 * manual: extender la prueba y activar el plan Colectivo.
 */

const ESTADO_UI: Record<OrganizacionAdmin["estado"], { label: string; clase: string }> = {
  ACTIVA: { label: "Activa", clase: "bg-agro-50 text-agro-600 border-agro-100" },
  EN_TRIAL: { label: "En prueba", clase: "bg-amber-50 text-amber-700 border-amber-100" },
  TRIAL_VENCIDO: { label: "Prueba vencida", clase: "bg-red-50 text-red-700 border-red-100" },
  SUSPENDIDA: { label: "Suspendida", clase: "bg-red-50 text-red-700 border-red-100" },
};

const TIPO_LABELS: Record<string, string> = { INDIVIDUAL: "Individual", COOPERATIVA: "Cooperativa" };

const fecha = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO", { dateStyle: "medium" }) : "—");

export function OrganizacionesAdminClient({ organizaciones }: { organizaciones: OrganizacionAdmin[] }) {
  const [, startTransition] = useTransition();
  const [extender, setExtender] = useState<OrganizacionAdmin | null>(null);
  const [activar, setActivar] = useState<OrganizacionAdmin | null>(null);
  const [dias, setDias] = useState("15");
  const [limite, setLimite] = useState("");
  const [vigencia, setVigencia] = useState("");
  const [cargando, setCargando] = useState(false);

  const ejecutar = (fn: () => Promise<{ error?: string }>, exito: string, cerrar: () => void) => {
    setCargando(true);
    startTransition(async () => {
      try {
        const r = await fn();
        if (r.error) {
          toast.error(r.error);
          return;
        }
        toast.success(exito);
        cerrar();
      } finally {
        setCargando(false);
      }
    });
  };

  if (organizaciones.length === 0) {
    return <EmptyState icon={<Clock size={28} />} title="Sin organizaciones" description="Todavía no hay organizaciones registradas." />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-3">
      <div className="card overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-4 py-3 font-medium">Organización</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Prueba / vigencia</th>
              <th className="px-4 py-3 font-medium">Asociados</th>
              <th className="px-4 py-3 font-medium">Fincas</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {organizaciones.map((o) => {
              const ui = ESTADO_UI[o.estado];
              return (
                <tr key={o.id} className="border-b border-[var(--border-subtle)] last:border-0 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-primary)]">{o.nombre}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {TIPO_LABELS[o.tipo] ?? o.tipo}{o.nit ? ` · NIT ${o.nit}` : ""}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)]">{o.duenos.join(", ") || "Sin dueño"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-[11px] font-semibold border rounded-full px-2.5 py-0.5 ${ui.clase}`}>{ui.label}</span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[var(--text-secondary)]">
                    {o.esTrial ? (
                      <>
                        Termina {fecha(o.trialFinEn)}
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {o.estado === "TRIAL_VENCIDO" ? "Ya venció" : `${o.diasRestantes} día(s)`}
                        </div>
                      </>
                    ) : o.planVigenteHasta ? (
                      `Vigente hasta ${fecha(o.planVigenteHasta)}`
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[var(--text-secondary)]">
                    {o.asociados}
                    {o.limiteAsociados !== null ? ` / ${o.limiteAsociados}` : " (sin límite)"}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[var(--text-secondary)]">{o.fincas}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {o.esTrial && (
                        <Button size="sm" variant="secondary" onClick={() => { setDias("15"); setExtender(o); }}>
                          <Clock size={13} /> Extender prueba
                        </Button>
                      )}
                      <Button size="sm" onClick={() => { setLimite(o.limiteAsociados?.toString() ?? ""); setVigencia(""); setActivar(o); }}>
                        <CheckCircle2 size={13} /> {o.esTrial || o.estado !== "ACTIVA" ? "Activar plan Colectivo" : "Cambiar plan"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal isOpen={!!extender} onClose={() => setExtender(null)} title="Extender la prueba" size="sm">
        {extender && (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--text-secondary)]">
              <b>{extender.nombre}</b> — termina {fecha(extender.trialFinEn)}. Los días se suman desde el fin actual, o
              desde hoy si ya venció. Los avisos por correo vuelven a empezar.
            </p>
            <Input label="Días a agregar (1 a 90)" type="number" min={1} max={90} value={dias} onChange={(e) => setDias(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setExtender(null)}>Cancelar</Button>
              <Button loading={cargando} onClick={() => ejecutar(() => extenderTrial(extender.id, Number(dias)), "Prueba extendida", () => setExtender(null))}>
                Extender
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!activar} onClose={() => setActivar(null)} title="Activar plan Colectivo" size="sm">
        {activar && (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--text-secondary)]">
              <b>{activar.nombre}</b> pasa a plan pago: se quita el límite de la prueba y se libera el modo lectura.
              El cobro se gestiona por fuera (manual).
            </p>
            <Input label="Límite de asociados (vacío = ilimitado)" type="number" min={1} value={limite} onChange={(e) => setLimite(e.target.value)} placeholder="Ej: 50" />
            <Input label="Vigente hasta (opcional)" type="date" value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setActivar(null)}>Cancelar</Button>
              <Button
                loading={cargando}
                onClick={() =>
                  ejecutar(
                    () => activarPlanColectivo(activar.id, limite.trim() ? Number(limite) : null, vigencia || null),
                    "Plan Colectivo activado",
                    () => setActivar(null)
                  )
                }
              >
                Activar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
