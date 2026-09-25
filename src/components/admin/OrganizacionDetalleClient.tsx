"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, PauseCircle, PlayCircle, Trash2, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { Button, Input, Modal } from "@/components/ui";
import type { OrganizacionDetalle } from "@/lib/data/organizaciones-admin";
import { ETIQUETAS_ACCION } from "@/lib/auditoria-labels";
import { ESTADO_ORG_UI, TIPO_ORG_LABELS } from "@/lib/etiquetas-organizacion";
import {
  editarOrganizacionAdmin,
  suspenderOrganizacion,
  reactivarOrganizacion,
  eliminarOrganizacion,
  restaurarOrganizacion,
} from "@/app/(dashboard)/dashboard/admin/organizaciones/organizacion-admin-actions";

/**
 * Detalle y administración de UNA organización (solo Super Admin): datos,
 * estado (suspender/reactivar), miembros, fincas, actividad y eliminación
 * lógica con restauración.
 */
const ROL_LABELS: Record<string, string> = {
  OWNER: "Dueño", ADMIN_FINCA: "Administrador de finca", COLABORADOR: "Colaborador", INVERSIONISTA: "Inversionista", COMPRADOR: "Comprador",
};
const fecha = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("es-CO", { dateStyle: "medium" }) : "—");

export function OrganizacionDetalleClient({ org }: { org: OrganizacionDetalle }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState({
    nombre: org.nombre, nit: org.nit ?? "", ciudad: org.ciudad ?? "", departamento: org.departamento ?? "",
    emailContacto: org.emailContacto ?? "", celularContacto: org.celularContacto ?? "",
  });
  const [modal, setModal] = useState<null | "suspender" | "eliminar">(null);
  const [motivo, setMotivo] = useState("");
  const [confirmarNombre, setConfirmarNombre] = useState("");

  const eliminada = !!org.eliminadaEn;
  const suspendida = org.estado === "SUSPENDIDA";
  const ui = eliminada ? { label: "Eliminada", clase: "bg-gray-100 text-gray-600 border-gray-200" } : ESTADO_ORG_UI[org.estado];

  const ejecutar = (fn: () => Promise<{ error?: string }>, exito: string, despues?: () => void) => {
    setCargando(true);
    startTransition(async () => {
      try {
        const r = await fn();
        if (r.error) {
          toast.error(r.error);
          return;
        }
        toast.success(exito);
        despues?.();
        router.refresh();
      } finally {
        setCargando(false);
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Link href="/dashboard/admin/organizaciones" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-agro-600 hover:text-agro-800">
        <ArrowLeft size={14} /> Todas las organizaciones
      </Link>

      {/* Resumen */}
      <div className="card p-5 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className={`inline-block text-[12px] font-semibold border rounded-full px-3 py-1 ${ui.clase}`}>{ui.label}</span>
        <span className="text-[13px] text-[var(--text-secondary)]">{TIPO_ORG_LABELS[org.tipo] ?? org.tipo}</span>
        <span className="text-[13px] text-[var(--text-secondary)]">Asociados: <b>{org.asociados}</b>{org.limiteAsociados !== null ? ` / ${org.limiteAsociados}` : " (sin límite)"}</span>
        <span className="text-[13px] text-[var(--text-secondary)]">Fincas: <b>{org.fincas}</b></span>
        <span className="text-[13px] text-[var(--text-secondary)]">Creada: {fecha(org.createdAt)}</span>
        {org.esTrial && <span className="text-[13px] text-[var(--text-secondary)]">Prueba hasta: <b>{fecha(org.trialFinEn)}</b></span>}
        {suspendida && org.suspension && (
          <span className="text-[13px] text-red-700 w-full">Suspendida el {fecha(org.suspension.en)} — motivo: {org.suspension.motivo}</span>
        )}
        {eliminada && <span className="text-[13px] text-red-700 w-full">Eliminada el {fecha(org.eliminadaEn)}. Sus miembros no pueden entrar; se puede restaurar.</span>}
      </div>

      {/* Datos */}
      <div className="card p-5 space-y-4">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Datos de la organización</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          <Input label="NIT" value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} />
          <Input label="Ciudad" value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
          <Input label="Departamento" value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })} />
          <Input label="Correo de contacto" type="email" value={form.emailContacto} onChange={(e) => setForm({ ...form, emailContacto: e.target.value })} />
          <Input label="Celular de contacto" value={form.celularContacto} onChange={(e) => setForm({ ...form, celularContacto: e.target.value })} />
        </div>
        <Button loading={cargando} onClick={() => ejecutar(() => editarOrganizacionAdmin(org.id, form), "Datos guardados")}>
          <Save size={14} /> Guardar datos
        </Button>
      </div>

      {/* Miembros */}
      <div className="card overflow-x-auto">
        <div className="px-5 pt-5 pb-2 text-[15px] font-semibold text-[var(--text-primary)]">Miembros ({org.miembros.length})</div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-5 py-2 font-medium">Persona</th><th className="px-5 py-2 font-medium">Rol</th><th className="px-5 py-2 font-medium">Acceso</th>
            </tr>
          </thead>
          <tbody>
            {org.miembros.map((m) => (
              <tr key={m.membresiaId} className="border-b border-[var(--border-subtle)] last:border-0">
                <td className="px-5 py-2.5"><div className="font-medium">{m.nombre ?? m.email}</div><div className="text-[11px] text-[var(--text-muted)]">{m.email}{m.esSuperAdmin ? " · Super Admin" : ""}</div></td>
                <td className="px-5 py-2.5 text-[var(--text-secondary)]">{ROL_LABELS[m.rol] ?? m.rol}</td>
                <td className="px-5 py-2.5 text-[var(--text-secondary)]">{m.activa ? "Activo" : "Desactivado"}</td>
              </tr>
            ))}
            {org.miembros.length === 0 && <tr><td colSpan={3} className="px-5 py-4 text-[var(--text-muted)]">Sin miembros.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Fincas */}
      <div className="card p-5">
        <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">Fincas ({org.fincasDetalle.length})</div>
        {org.fincasDetalle.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">Sin fincas.</p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {org.fincasDetalle.map((f) => (
              <li key={f.id} className="py-2 text-[13px] flex justify-between"><span className="font-medium">{f.nombre} <span className="text-[var(--text-muted)] font-normal">· {f.municipio}</span></span><span className="text-[var(--text-secondary)]">{f.lotes} lote(s)</span></li>
            ))}
          </ul>
        )}
      </div>

      {/* Actividad */}
      <div className="card p-5">
        <div className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">Actividad reciente</div>
        {org.auditoria.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">Sin eventos registrados.</p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {org.auditoria.map((a) => (
              <li key={a.id} className="py-2 text-[12px] flex justify-between gap-3">
                <span className="text-[var(--text-primary)]">{ETIQUETAS_ACCION[a.accion] ?? a.accion}</span>
                <span className="text-[var(--text-muted)] whitespace-nowrap">{a.actorEmail ?? "—"} · {new Date(a.createdAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Estado y zona de riesgo */}
      <div className="card p-5 space-y-3 border-negative-100">
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Estado y zona de riesgo</h2>
        {!eliminada && (
          <div className="flex flex-wrap gap-2">
            {suspendida ? (
              <Button variant="secondary" loading={cargando} onClick={() => ejecutar(() => reactivarOrganizacion(org.id), "Organización reactivada")}>
                <PlayCircle size={14} /> Reactivar
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => { setMotivo(""); setModal("suspender"); }}>
                <PauseCircle size={14} /> Suspender (modo lectura)
              </Button>
            )}
            <Button variant="danger" onClick={() => { setConfirmarNombre(""); setModal("eliminar"); }}>
              <Trash2 size={14} /> Eliminar organización
            </Button>
          </div>
        )}
        {eliminada && (
          <Button variant="secondary" loading={cargando} onClick={() => ejecutar(() => restaurarOrganizacion(org.id), "Organización restaurada")}>
            <RotateCcw size={14} /> Restaurar organización
          </Button>
        )}
        <p className="text-[12px] text-[var(--text-muted)]">
          Suspender deja la organización en <b>modo lectura</b> (sus miembros ven todo, pero no pueden agregar ni editar). Eliminar la oculta y les quita
          el acceso, pero <b>no borra sus datos</b>: se puede restaurar.
        </p>
      </div>

      <Modal isOpen={modal === "suspender"} onClose={() => setModal(null)} title="Suspender organización" size="sm">
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--text-secondary)]">
            <b>{org.nombre}</b> pasará a modo lectura: sus {org.miembros.length} miembro(s) podrán ver su información pero no agregar ni editar nada.
          </p>
          <Input label="Motivo (obligatorio)" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: pago pendiente" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button loading={cargando} onClick={() => ejecutar(() => suspenderOrganizacion(org.id, motivo), "Organización suspendida", () => setModal(null))}>Suspender</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modal === "eliminar"} onClose={() => setModal(null)} title="Eliminar organización" size="sm">
        <div className="space-y-4">
          <p className="text-[13px] text-[var(--text-secondary)]">
            Sus <b>{org.miembros.length} miembro(s)</b> perderán el acceso de inmediato. Los datos no se borran y podrás restaurarla. Para confirmar, escribe el
            nombre exacto: <b>{org.nombre}</b>
          </p>
          <Input label="Nombre de la organización" value={confirmarNombre} onChange={(e) => setConfirmarNombre(e.target.value)} autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" loading={cargando} disabled={confirmarNombre.trim() !== org.nombre.trim()}
              onClick={() => ejecutar(() => eliminarOrganizacion(org.id, confirmarNombre), "Organización eliminada", () => setModal(null))}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
