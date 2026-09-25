"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Clock, CheckCircle2, Settings2, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input, Modal, EmptyState } from "@/components/ui";
import type { OrganizacionAdmin } from "@/lib/data/organizaciones-admin";
import { ESTADO_ORG_UI, TIPO_ORG_LABELS } from "@/lib/etiquetas-organizacion";
import { extenderTrial, activarPlanColectivo } from "@/app/(dashboard)/dashboard/admin/organizaciones/organizacion-admin-actions";

/**
 * Panel Super Admin de organizaciones (Colectivo/Cooperativa, PR C) — lista
 * de organizaciones con su plan/prueba y las dos acciones de la conversión
 * manual: extender la prueba y activar el plan Colectivo.
 */

const fecha = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CO", { dateStyle: "medium" }) : "—");

export function OrganizacionesAdminClient({ organizaciones }: { organizaciones: OrganizacionAdmin[] }) {
  const [, startTransition] = useTransition();
  const [extender, setExtender] = useState<OrganizacionAdmin | null>(null);
  const [activar, setActivar] = useState<OrganizacionAdmin | null>(null);
  const [dias, setDias] = useState("15");
  const [limite, setLimite] = useState("");
  const [vigencia, setVigencia] = useState("");
  const [cargando, setCargando] = useState(false);
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "activas" | "prueba" | "suspendidas" | "eliminadas">("todas");

  const visibles = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return organizaciones.filter((o) => {
      const eliminada = !!o.eliminadaEn;
      if (filtro === "eliminadas") { if (!eliminada) return false; }
      else if (eliminada) return false; // las eliminadas solo se ven en su filtro
      if (filtro === "activas" && o.estado !== "ACTIVA") return false;
      if (filtro === "prueba" && o.estado !== "EN_TRIAL" && o.estado !== "TRIAL_VENCIDO") return false;
      if (filtro === "suspendidas" && o.estado !== "SUSPENDIDA") return false;
      return !q || o.nombre.toLowerCase().includes(q) || (o.nit ?? "").includes(q) || o.duenos.some((d) => d.toLowerCase().includes(q));
    });
  }, [organizaciones, buscar, filtro]);

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
      <div className="card p-4 text-[13px] text-[var(--text-secondary)] border-agro-100 bg-agro-50">
        <b>Administración de plataforma.</b> Aquí ves <b>todas</b> las organizaciones de GermIA y lo que cambies afecta a
        sus miembros. Los datos de <b>tu propia</b> organización están en Configuración → Organización.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre, NIT o correo del dueño…"
            className="w-full h-9 pl-9 pr-3 text-[13px] bg-white border border-[var(--border-default)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-agro-200"
          />
        </div>
        {(["todas", "activas", "prueba", "suspendidas", "eliminadas"] as const).map((f) => (
          <button
            key={f} onClick={() => setFiltro(f)}
            className={`h-9 px-3 rounded-full text-[12px] font-medium border transition-colors ${filtro === f ? "bg-agro-600 text-white border-agro-600" : "bg-white text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-agro-50"}`}
          >
            {{ todas: "Todas", activas: "Activas", prueba: "En prueba", suspendidas: "Suspendidas", eliminadas: "Eliminadas" }[f]}
          </button>
        ))}
      </div>

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
            {visibles.map((o) => {
              const ui = o.eliminadaEn ? { label: "Eliminada", clase: "bg-gray-100 text-gray-600 border-gray-200" } : ESTADO_ORG_UI[o.estado];
              return (
                <tr key={o.id} className="border-b border-[var(--border-subtle)] last:border-0 align-top">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/admin/organizaciones/${o.id}`} className="font-medium text-agro-600 hover:text-agro-800 hover:underline">{o.nombre}</Link>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {TIPO_ORG_LABELS[o.tipo] ?? o.tipo}{o.nit ? ` · NIT ${o.nit}` : ""}
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
                      <Link href={`/dashboard/admin/organizaciones/${o.id}`}>
                        <Button size="sm" variant="secondary"><Settings2 size={13} /> Administrar</Button>
                      </Link>
                      {!o.eliminadaEn && o.esTrial && (
                        <Button size="sm" variant="secondary" onClick={() => { setDias("15"); setExtender(o); }}>
                          <Clock size={13} /> Extender prueba
                        </Button>
                      )}
                      {!o.eliminadaEn && (
                        <Button size="sm" onClick={() => { setLimite(o.limiteAsociados?.toString() ?? ""); setVigencia(""); setActivar(o); }}>
                          <CheckCircle2 size={13} /> {o.esTrial || o.estado !== "ACTIVA" ? "Activar plan Colectivo" : "Cambiar plan"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {visibles.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[13px] text-[var(--text-muted)]">Ninguna organización coincide con el filtro.</td></tr>
            )}
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
