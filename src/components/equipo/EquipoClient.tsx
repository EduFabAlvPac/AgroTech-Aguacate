"use client";

import { useState, useTransition } from "react";
import { Plus, User, Trash2, ShieldCheck, Wrench, Eye, Pencil, Power, PowerOff, Save, Users as UsersIcon, SlidersHorizontal, Smartphone, MessageCircle, History, Download } from "lucide-react";
import { Button, Modal, Input, Select, EmptyState } from "@/components/ui";
import toast from "react-hot-toast";
import type { RolOrganizacion } from "@prisma/client";
import { MODULOS_DASHBOARD, modulosPorDefecto, type ModuloKey, type PlantillasModulos } from "@/lib/modulos";
import {
  agregarMiembro,
  editarMiembro,
  toggleActivaMiembro,
  eliminarMiembro,
  guardarPlantillaRol,
} from "@/app/(dashboard)/dashboard/equipo/equipo-actions";
import { crearCuentaCampesino, eliminarCuentaCampesino } from "@/app/(dashboard)/dashboard/equipo/campesino-actions";
import { invitarMiembroPorCorreo } from "@/app/(dashboard)/dashboard/equipo/invitacion-actions";
import { exportarAuditoriaCSV } from "@/app/(dashboard)/dashboard/equipo/auditoria-actions";
import { ETIQUETAS_ACCION } from "@/lib/auditoria-labels";
import type { AuditoriaEvento } from "@/lib/data/auditoria";

type RolFinca = "ADMIN" | "OPERARIO" | "LECTURA";

interface FincaOption {
  id: string;
  nombre: string;
}

interface FincaAccesoData {
  fincaId: string;
  nombre: string;
  rol: string;
  modulos: string[];
}

interface MiembroData {
  id: string;
  nombre: string | null;
  email: string;
  rol: RolOrganizacion;
  activa: boolean;
  fincas: FincaAccesoData[];
}

interface CuentaCampesinoData {
  id: string;
  nombre: string | null;
  telefono: string | null;
  createdAt: Date;
}

// El rol que de verdad importa para "qué puede hacer/ver" es el de finca
// (RolFinca — ver src/lib/authz.ts, MATRIZ_FINCA). El rol de organización
// (RolOrganizacion) solo distingue ADMIN_FINCA de COLABORADOR a nivel de
// membresía — OPERARIO y LECTURA caen ambos en COLABORADOR ahí, la
// diferencia real la impone FincaAcceso.rol.
const ROL_FINCA_LABELS: Record<RolFinca, string> = {
  ADMIN: "Administrador de finca",
  OPERARIO: "Colaborador de campo",
  LECTURA: "Solo lectura",
};

const ROL_FINCA_COLORS: Record<RolFinca, { bg: string; color: string }> = {
  ADMIN: { bg: "var(--color-info-bg)", color: "var(--color-info)" },
  OPERARIO: { bg: "var(--color-brand-bg)", color: "var(--color-brand-dark)" },
  LECTURA: { bg: "var(--color-surface-gray)", color: "var(--color-text-soft)" },
};

const ROL_FINCA_ICONS: Record<RolFinca, React.ElementType> = {
  ADMIN: ShieldCheck,
  OPERARIO: Wrench,
  LECTURA: Eye,
};

const ROL_FINCA_OPTIONS = [
  { value: "OPERARIO", label: "Colaborador de campo" },
  { value: "LECTURA", label: "Solo lectura" },
  { value: "ADMIN", label: "Administrador de finca" },
];

// Invitar por correo (ADR-011 Sprint 3) solo ofrece 2 de los 3 roles — sin
// "Solo lectura" (ver comentario en invitarMiembroSchema, validations.ts:
// el enum IAM que guarda la invitación no distingue OPERARIO de LECTURA,
// así que ofrecer esa opción acá arriesgaría una discrepancia silenciosa
// entre lo que el dueño elige y el permiso real que queda al aceptar). Se
// puede ajustar a "Solo lectura" después, desde "Editar".
const ROL_FINCA_OPTIONS_INVITAR = ROL_FINCA_OPTIONS.filter((o) => o.value !== "LECTURA");

const emptyForm = {
  nombre: "",
  email: "",
  password: "",
  rolFinca: "OPERARIO" as RolFinca,
  fincaId: "",
  modulos: modulosPorDefecto("OPERARIO"),
};

const emptyInviteForm = { email: "", rolFinca: "OPERARIO" as "ADMIN" | "OPERARIO", fincaId: "", mensajePersonal: "" };

/**
 * Puente hasta que exista el WhatsApp Business API real (ADR-011 Sprint 4,
 * pendiente de cuenta de Meta + firma del fundador sobre "WhatsApp sin
 * respaldo SMS") — un cuenta Campesino hoy no recibe ningún aviso
 * automático de que ya tiene acceso. `wa.me` es un enlace público de
 * WhatsApp (no la API de Meta, no necesita cuenta de negocio ni plantillas
 * aprobadas): abre el WhatsApp del propio dueño con el mensaje ya
 * redactado, listo para mandar con un toque — el dueño sigue siendo quien
 * envía, desde su número personal.
 *
 * `telefono` ya viene solo en dígitos (normalizarTelefono(), sin +57) — se
 * antepone el indicativo de Colombia porque hoy toda la app es solo
 * Colombia (paisIso @default("CO")).
 */
function enlaceWhatsAppCampesino(nombre: string | null, telefono: string): string {
  const numero = `57${telefono}`;
  const mensaje = `Hola ${nombre ?? ""}, ya tienes acceso a GermIA. Abre este enlace y entra con tu número de celular (sin contraseña): ${window.location.origin}/login`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}

export function EquipoClient({
  miembros: initial,
  fincas,
  plantillasIniciales,
  cuentasCampesinoIniciales,
  auditoria,
}: {
  miembros: MiembroData[];
  fincas: FincaOption[];
  plantillasIniciales: PlantillasModulos;
  cuentasCampesinoIniciales: CuentaCampesinoData[];
  // ADR-011 Sprint 5 — la página ya gatea toda esta pantalla a "solo OWNER"
  // (equipo/page.tsx redirige si no lo es), así que no hace falta un chequeo
  // aparte acá para mostrar la pestaña.
  auditoria: AuditoriaEvento[];
}) {
  const [tab, setTab] = useState<"miembros" | "roles" | "auditoria">("miembros");
  const [exportandoAuditoria, setExportandoAuditoria] = useState(false);
  const [miembros, setMiembros] = useState(initial);
  const [cuentasCampesino, setCuentasCampesino] = useState(cuentasCampesinoIniciales);
  const [eliminandoCampesinoId, setEliminandoCampesinoId] = useState<string | null>(null);
  const [plantillas, setPlantillas] = useState(plantillasIniciales);
  const [showModal, setShowModal] = useState(false);
  // ADR-011 Sprint 3 — dos formas de sumar un colaborador: crear la cuenta
  // directamente (flujo de siempre) o invitar por correo (nuevo). El modal
  // es el mismo, solo cambia qué pide y a qué Server Action llama.
  const [modoAgregar, setModoAgregar] = useState<"cuenta" | "invitar">("cuenta");
  const [form, setForm] = useState(() => ({
    ...emptyForm,
    fincaId: fincas[0]?.id ?? "",
    modulos: plantillasIniciales.OPERARIO,
  }));
  const [inviteForm, setInviteForm] = useState(() => ({ ...emptyInviteForm, fincaId: fincas[0]?.id ?? "" }));
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  const [editing, setEditing] = useState<MiembroData | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editLoading, setEditLoading] = useState(false);

  const [deleting, setDeleting] = useState<MiembroData | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [guardandoRol, setGuardandoRol] = useState<RolFinca | null>(null);

  // Alta de cuenta "modo Campesino" (experiencia separada, sin Finca/Membresia
  // — ver campesino-actions.ts) — modal independiente, más simple que el de
  // arriba porque no pide finca/rol/módulos.
  const [showCampesinoModal, setShowCampesinoModal] = useState(false);
  const [campesinoForm, setCampesinoForm] = useState({ nombre: "", telefono: "" });
  const [campesinoLoading, setCampesinoLoading] = useState(false);

  const handleAgregarCampesino = () => {
    if (!campesinoForm.nombre.trim()) return toast.error("El nombre es requerido");
    if (campesinoForm.telefono.trim().length < 7) return toast.error("Ingresa un número de celular válido");
    setCampesinoLoading(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("nombre", campesinoForm.nombre);
        fd.set("telefono", campesinoForm.telefono);

        const result = await crearCuentaCampesino({}, fd);
        if (result.error || !result.cuenta) {
          toast.error(result.error || "Error al crear la cuenta");
          return;
        }
        toast.success(`Cuenta creada — ${result.cuenta.nombre} ya puede entrar con su celular (${result.cuenta.telefono}).`);
        setCuentasCampesino((prev) => [
          { id: result.cuenta!.id, nombre: result.cuenta!.nombre, telefono: result.cuenta!.telefono, createdAt: new Date() },
          ...prev,
        ]);
        setShowCampesinoModal(false);
        setCampesinoForm({ nombre: "", telefono: "" });
      } finally {
        setCampesinoLoading(false);
      }
    });
  };

  const handleEliminarCampesino = (id: string) => {
    setEliminandoCampesinoId(id);
    startTransition(async () => {
      try {
        const result = await eliminarCuentaCampesino({}, id);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setCuentasCampesino((prev) => prev.filter((c) => c.id !== id));
        toast.success("Cuenta Campesino eliminada");
      } finally {
        setEliminandoCampesinoId(null);
      }
    });
  };

  function toggleModulo<T>(list: T[], key: T): T[] {
    return list.includes(key) ? list.filter((m) => m !== key) : [...list, key];
  }

  // Server Action nativa (Fase 1, ADR-006) en vez de fetch — se llama
  // directamente dentro de startTransition. No se usa useActionState en
  // este módulo: los cinco modales (agregar/editar/eliminar/roles/toggle)
  // ya manejan su propio estado local de "loading" por handler, y son
  // acciones puntuales disparadas por botón, no <form> con submit nativo.
  const handleGuardarPlantilla = (rol: RolFinca) => {
    setGuardandoRol(rol);
    startTransition(async () => {
      const result = await guardarPlantillaRol(rol, plantillas[rol]);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Plantilla guardada — aplica a las próximas personas que agregues con este rol.");
      }
      setGuardandoRol(null);
    });
  };

  const handleAgregar = () => {
    if (!form.email.trim()) return toast.error("El email es requerido");
    if (!form.fincaId) return toast.error("Selecciona la finca a la que tendrá acceso");
    setLoading(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("nombre", form.nombre);
        fd.set("email", form.email);
        fd.set("password", form.password);
        fd.set("rolFinca", form.rolFinca);
        fd.set("fincaId", form.fincaId);
        fd.set("modulos", JSON.stringify(form.modulos));

        const result = await agregarMiembro({}, fd);
        if (result.error || !result.miembro) {
          toast.error(result.error || "Error al agregar");
          return;
        }
        setMiembros((prev) => [
          {
            id: result.miembro!.id,
            nombre: result.miembro!.nombre,
            email: result.miembro!.email,
            rol: result.miembro!.rol as RolOrganizacion,
            activa: true,
            fincas: [{
              fincaId: form.fincaId,
              nombre: fincas.find((f) => f.id === form.fincaId)?.nombre ?? "?",
              rol: form.rolFinca,
              modulos: form.modulos,
            }],
          },
          ...prev,
        ]);
        toast.success("Colaborador agregado — comparte sus credenciales por WhatsApp o en persona.");
        setShowModal(false);
        setForm({ ...emptyForm, fincaId: fincas[0]?.id ?? "", modulos: plantillas.OPERARIO });
      } finally {
        setLoading(false);
      }
    });
  };

  const handleInvitar = () => {
    if (!inviteForm.email.trim()) return toast.error("El email es requerido");
    if (!inviteForm.fincaId) return toast.error("Selecciona la finca a la que tendrá acceso");
    setLoading(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("email", inviteForm.email);
        fd.set("rolFinca", inviteForm.rolFinca);
        fd.set("fincaId", inviteForm.fincaId);
        fd.set("mensajePersonal", inviteForm.mensajePersonal);

        const result = await invitarMiembroPorCorreo({}, fd);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        toast.success(`Invitación enviada a ${inviteForm.email}`);
        setShowModal(false);
        setInviteForm({ ...emptyInviteForm, fincaId: fincas[0]?.id ?? "" });
      } finally {
        setLoading(false);
      }
    });
  };

  // ADR-011 Sprint 5 — mismo patrón que handleExportar() en ConfigClient.tsx
  // (exportarMisDatos): una Server Action no puede mandar Content-Disposition,
  // así que arma el CSV como string y el cliente construye el Blob.
  const handleExportarAuditoria = () => {
    setExportandoAuditoria(true);
    startTransition(async () => {
      try {
        const result = await exportarAuditoriaCSV();
        if (result.error || !result.csv) {
          toast.error(result.error || "No se pudo generar el archivo");
          return;
        }
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename ?? `germia-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Descarga iniciada");
      } finally {
        setExportandoAuditoria(false);
      }
    });
  };

  const abrirEditar = (m: MiembroData) => {
    const acceso = m.fincas[0];
    const rolFinca: RolFinca =
      acceso?.rol === "ADMIN" || acceso?.rol === "OPERARIO" || acceso?.rol === "LECTURA"
        ? acceso.rol
        : m.rol === "ADMIN_FINCA" ? "ADMIN" : "OPERARIO";
    setEditForm({
      nombre: m.nombre ?? "",
      email: m.email,
      password: "",
      rolFinca,
      fincaId: acceso?.fincaId ?? fincas[0]?.id ?? "",
      modulos: acceso?.modulos && acceso.modulos.length > 0 ? (acceso.modulos as ModuloKey[]) : plantillas[rolFinca],
    });
    setEditing(m);
  };

  const handleGuardarEdicion = () => {
    if (!editing) return;
    if (!editForm.fincaId) return toast.error("Selecciona la finca con acceso");
    const editingId = editing.id;
    setEditLoading(true);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("rolFinca", editForm.rolFinca);
        fd.set("fincaId", editForm.fincaId);
        fd.set("modulos", JSON.stringify(editForm.modulos));

        const result = await editarMiembro(editingId, {}, fd);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setMiembros((prev) =>
          prev.map((m) =>
            m.id === editingId
              ? {
                  ...m,
                  rol: editForm.rolFinca === "ADMIN" ? "ADMIN_FINCA" : "COLABORADOR",
                  fincas: [{
                    fincaId: editForm.fincaId,
                    nombre: fincas.find((f) => f.id === editForm.fincaId)?.nombre ?? "?",
                    rol: editForm.rolFinca,
                    modulos: editForm.modulos,
                  }],
                }
              : m
          )
        );
        toast.success("Cambios guardados");
        setEditing(null);
      } finally {
        setEditLoading(false);
      }
    });
  };

  const handleToggleActiva = (m: MiembroData) => {
    setTogglingId(m.id);
    const nuevaActiva = !m.activa;
    startTransition(async () => {
      try {
        const result = await toggleActivaMiembro(m.id, nuevaActiva);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setMiembros((prev) => prev.map((x) => (x.id === m.id ? { ...x, activa: nuevaActiva } : x)));
        toast.success(nuevaActiva ? "Colaborador reactivado" : "Colaborador desactivado — no podrá iniciar sesión en tus fincas hasta que lo reactives.");
      } finally {
        setTogglingId(null);
      }
    });
  };

  const handleEliminar = () => {
    if (!deleting) return;
    const deletingId = deleting.id;
    setDeletingLoading(true);
    startTransition(async () => {
      try {
        const result = await eliminarMiembro({}, deletingId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        setMiembros((prev) => prev.filter((m) => m.id !== deletingId));
        toast.success("Colaborador removido");
        setDeleting(null);
      } finally {
        setDeletingLoading(false);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 p-1 bg-[var(--surface-page)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
          {[
            { id: "miembros" as const, label: "Miembros", icon: UsersIcon },
            { id: "roles" as const, label: "Roles y permisos", icon: SlidersHorizontal },
            { id: "auditoria" as const, label: "Auditoría", icon: History },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-[13px] font-medium transition-all ${
                tab === id
                  ? "bg-white text-agro-600 shadow-card border border-agro-100"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        {tab === "miembros" && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowCampesinoModal(true)}>
              <Smartphone size={16} /> Agregar Campesino
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <Plus size={16} /> Agregar colaborador
            </Button>
          </div>
        )}
        {tab === "auditoria" && (
          <Button variant="secondary" loading={exportandoAuditoria} onClick={handleExportarAuditoria}>
            <Download size={16} /> Descargar CSV (últimos 30 días)
          </Button>
        )}
      </div>

      {tab === "auditoria" && (
        <div className="space-y-2">
          <p className="text-[12px] text-[var(--text-muted)]">
            Últimos {auditoria.length} evento{auditoria.length === 1 ? "" : "s"} de tu organización — creación/edición de
            colaboradores, invitaciones, cambios en los datos de la organización. El CSV incluye los últimos 30 días
            completos, no solo lo que ves acá.
          </p>
          {auditoria.length === 0 ? (
            <EmptyState
              icon={<History size={22} />}
              title="Sin eventos todavía"
              description="Acá vas a ver el historial de cambios en tu equipo y tu organización."
            />
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Quién</th>
                    <th className="px-4 py-3 font-medium">Acción</th>
                    <th className="px-4 py-3 font-medium">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {auditoria.map((evento) => (
                    <tr key={evento.id} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                        {new Date(evento.createdAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{evento.actorEmail ?? "—"}</td>
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                        {ETIQUETAS_ACCION[evento.accion] ?? evento.accion}
                      </td>
                      <td
                        className="px-4 py-3 text-[11px] text-[var(--text-muted)] max-w-xs truncate"
                        title={evento.detalle ? JSON.stringify(evento.detalle) : ""}
                      >
                        {evento.detalle ? JSON.stringify(evento.detalle) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "roles" && (
        <div className="space-y-4">
          <p className="text-[12px] text-[var(--text-muted)]">
            Define qué menús ve por defecto cada tipo de rol al agregarlo. Puedes seguir ajustando el acceso de una
            persona puntual desde la pestaña Miembros — eso no cambia por editar la plantilla aquí.
          </p>
          {(["ADMIN", "OPERARIO", "LECTURA"] as const).map((rolFinca) => {
            const Icon = ROL_FINCA_ICONS[rolFinca];
            return (
              <div key={rolFinca} className="card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Icon size={16} className="text-agro-400" />
                  <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{ROL_FINCA_LABELS[rolFinca]}</h3>
                </div>
                {rolFinca === "LECTURA" && (
                  <p className="text-[11px] text-[var(--text-muted)] -mt-2">
                    Sin importar los menús marcados aquí, este rol nunca puede crear/editar/borrar — solo consultar.
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {MODULOS_DASHBOARD.map((mod) => (
                    <label key={mod.key} className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={plantillas[rolFinca].includes(mod.key)}
                        onChange={() =>
                          setPlantillas((prev) => ({
                            ...prev,
                            [rolFinca]: toggleModulo(prev[rolFinca], mod.key),
                          }))
                        }
                      />
                      {mod.label}
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={guardandoRol === rolFinca}
                    onClick={() => handleGuardarPlantilla(rolFinca)}
                  >
                    <Save size={13} /> Guardar plantilla
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "miembros" && cuentasCampesino.length > 0 && (
        <div className="space-y-2 mb-5">
          <p className="text-[12px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
            <Smartphone size={13} /> Cuentas Campesino ({cuentasCampesino.length})
          </p>
          {cuentasCampesino.map((c) => (
            <div key={c.id} className="card p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-agro-50 flex items-center justify-center flex-shrink-0">
                  <Smartphone size={18} className="text-agro-400" />
                </div>
                <div>
                  <span className="text-[13px] font-medium text-[var(--text-primary)]">{c.nombre ?? "Sin nombre"}</span>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Entra con su celular: {c.telefono} · sin acceso a tus fincas ni datos
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {c.telefono && (
                  <a
                    href={enlaceWhatsAppCampesino(c.nombre, c.telefono)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-agro-50 transition-colors"
                    aria-label="Avisarle por WhatsApp"
                    title="Avisarle por WhatsApp que ya tiene acceso"
                  >
                    <MessageCircle size={14} className="text-[var(--text-muted)] hover:text-agro-600" />
                  </a>
                )}
                <button
                  onClick={() => handleEliminarCampesino(c.id)}
                  disabled={eliminandoCampesinoId === c.id}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-negative-50 transition-colors disabled:opacity-50"
                  aria-label="Eliminar cuenta Campesino"
                  title="Eliminar"
                >
                  <Trash2 size={14} className="text-[var(--text-muted)] hover:text-negative-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "miembros" && (miembros.length === 0 ? (
        <EmptyState
          icon={<User size={28} />}
          title="Sin colaboradores todavía"
          description="Agrega administradores o colaboradores de campo para que puedan registrar actividades y gastos en tus fincas."
          action={<Button onClick={() => setShowModal(true)}><Plus size={14} /> Agregar colaborador</Button>}
        />
      ) : (
        <div className="space-y-2">
          {miembros.map((m) => {
            const rolFincaActual: RolFinca =
              m.fincas[0]?.rol === "ADMIN" || m.fincas[0]?.rol === "OPERARIO" || m.fincas[0]?.rol === "LECTURA"
                ? m.fincas[0].rol
                : m.rol === "ADMIN_FINCA" ? "ADMIN" : "OPERARIO";
            const Icon = ROL_FINCA_ICONS[rolFincaActual];
            return (
            <div key={m.id} className={`card p-4 flex items-center justify-between flex-wrap gap-3 ${!m.activa ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-agro-50 flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-agro-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">{m.nombre ?? m.email}</span>
                    <span
                      className="badge text-[10px] font-medium rounded-full px-2 py-0.5"
                      style={{ background: ROL_FINCA_COLORS[rolFincaActual].bg, color: ROL_FINCA_COLORS[rolFincaActual].color }}
                    >
                      {ROL_FINCA_LABELS[rolFincaActual]}
                    </span>
                    {!m.activa && (
                      <span className="badge text-[10px] font-medium rounded-full px-2 py-0.5" style={{ background: "var(--color-surface-gray)", color: "var(--color-text-soft)" }}>
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {m.email}
                    {m.fincas.length > 0 && ` · Acceso a: ${m.fincas.map((f) => f.nombre).join(", ")}`}
                  </p>
                  {m.fincas[0] && (
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      Menús: {m.fincas[0].modulos.length > 0
                        ? m.fincas[0].modulos.map((k) => MODULOS_DASHBOARD.find((mm) => mm.key === k)?.label ?? k).join(", ")
                        : "Ninguno personalizado"}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => abrirEditar(m)}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-agro-50 transition-colors flex-shrink-0"
                  aria-label="Consultar y editar"
                  title="Consultar y editar"
                >
                  <Pencil size={14} className="text-[var(--text-muted)] hover:text-agro-500" />
                </button>
                <button
                  onClick={() => handleToggleActiva(m)}
                  disabled={togglingId === m.id}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-harvest-50 transition-colors flex-shrink-0 disabled:opacity-50"
                  aria-label={m.activa ? "Inactivar" : "Reactivar"}
                  title={m.activa ? "Inactivar" : "Reactivar"}
                >
                  {m.activa ? (
                    <PowerOff size={14} className="text-[var(--text-muted)] hover:text-harvest-400" />
                  ) : (
                    <Power size={14} className="text-[var(--text-muted)] hover:text-agro-500" />
                  )}
                </button>
                <button
                  onClick={() => setDeleting(m)}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-negative-50 transition-colors flex-shrink-0"
                  aria-label="Remover colaborador"
                  title="Eliminar"
                >
                  <Trash2 size={14} className="text-[var(--text-muted)] hover:text-negative-400" />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      ))}

      {/* Modal: agregar colaborador */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Agregar colaborador">
        <div className="space-y-3">
          {/* ADR-011 Sprint 3 — elegir entre crear la cuenta directamente
              (flujo de siempre) o invitar por correo (nuevo). */}
          <div className="flex gap-1 p-1 bg-[var(--surface-page)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] -mt-1">
            {(
              [
                { id: "cuenta" as const, label: "Crear cuenta" },
                { id: "invitar" as const, label: "Invitar por correo" },
              ]
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setModoAgregar(id)}
                className={`flex-1 py-1.5 rounded-[var(--radius-md)] text-[12px] font-medium transition-all ${
                  modoAgregar === id
                    ? "bg-white text-agro-600 shadow-card border border-agro-100"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {modoAgregar === "cuenta" ? (
            <>
              <p className="text-[12px] text-[var(--text-muted)] -mt-1">
                No hay envío de correo automático — crea la cuenta aquí y comparte el email/contraseña con la persona por
                WhatsApp o en persona. Si el email ya tiene cuenta en GermIA, se agrega directamente sin pedir contraseña.
              </p>
              <Input
                label="Nombre"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Jhon Álvarez"
              />
              <Input
                label="Email *"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="colaborador@ejemplo.co"
              />
              <Input
                label="Contraseña temporal (solo si es cuenta nueva)"
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Rol"
                  value={form.rolFinca}
                  onChange={(e) => {
                    const rolFinca = e.target.value as RolFinca;
                    setForm({ ...form, rolFinca, modulos: plantillas[rolFinca] });
                  }}
                  options={ROL_FINCA_OPTIONS}
                />
                <Select
                  label="Finca con acceso"
                  value={form.fincaId}
                  onChange={(e) => setForm({ ...form, fincaId: e.target.value })}
                  options={fincas.map((f) => ({ value: f.id, label: f.nombre }))}
                />
              </div>
              {form.rolFinca === "LECTURA" && (
                <p className="text-[11px] text-[var(--text-muted)] -mt-1">
                  Este rol solo puede consultar — nunca crear, editar ni borrar, sin importar qué menús marques abajo.
                </p>
              )}
              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                  Menús a los que puede ingresar
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MODULOS_DASHBOARD.map((mod) => (
                    <label key={mod.key} className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={form.modulos.includes(mod.key)}
                        onChange={() => setForm({ ...form, modulos: toggleModulo(form.modulos, mod.key) })}
                      />
                      {mod.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button loading={loading} onClick={handleAgregar}>Agregar</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-[12px] text-[var(--text-muted)] -mt-1">
                Le mandamos un enlace a su correo — acepta con la cuenta que ya tenga en GermIA o crea una nueva, sin que
                tengas que compartirle ninguna contraseña. Los menús que puede ver salen de la plantilla de "Roles y
                permisos"; puedes ajustarlos después desde "Editar".
              </p>
              <Input
                label="Email *"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="colaborador@ejemplo.co"
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Rol"
                  value={inviteForm.rolFinca}
                  onChange={(e) => setInviteForm({ ...inviteForm, rolFinca: e.target.value as "ADMIN" | "OPERARIO" })}
                  options={ROL_FINCA_OPTIONS_INVITAR}
                />
                <Select
                  label="Finca con acceso"
                  value={inviteForm.fincaId}
                  onChange={(e) => setInviteForm({ ...inviteForm, fincaId: e.target.value })}
                  options={fincas.map((f) => ({ value: f.id, label: f.nombre }))}
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                  Mensaje personal (opcional)
                </label>
                <textarea
                  value={inviteForm.mensajePersonal}
                  onChange={(e) => setInviteForm({ ...inviteForm, mensajePersonal: e.target.value })}
                  placeholder="Ej: Hola Juan, te agrego al equipo de la finca para que registres las actividades del lote B."
                  rows={2}
                  className="w-full px-3 py-2 text-[13px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button loading={loading} onClick={handleInvitar}>Enviar invitación</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal: agregar cuenta Campesino */}
      <Modal isOpen={showCampesinoModal} onClose={() => setShowCampesinoModal(false)} title="Agregar Campesino" size="sm">
        <div className="space-y-3">
          <p className="text-[12px] text-[var(--text-muted)] -mt-1">
            Cuenta de la experiencia simplificada (modo Campesino): entra solo con su número de celular, sin
            contraseña. No tiene acceso a esta finca ni a tus datos — solo a diagnóstico, tienda, precios y clima.
          </p>
          <Input
            label="Nombre *"
            value={campesinoForm.nombre}
            onChange={(e) => setCampesinoForm({ ...campesinoForm, nombre: e.target.value })}
            placeholder="Ej: José Ramírez"
          />
          <Input
            label="Número de celular *"
            type="tel"
            value={campesinoForm.telefono}
            onChange={(e) => setCampesinoForm({ ...campesinoForm, telefono: e.target.value })}
            placeholder="300 123 4567"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCampesinoModal(false)}>Cancelar</Button>
            <Button loading={campesinoLoading} onClick={handleAgregarCampesino}>Agregar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: consultar / editar colaborador */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Consultar y editar colaborador">
        {editing && (
          <div className="space-y-3">
            <div className="text-[13px] text-[var(--text-primary)] font-medium">{editing.nombre ?? editing.email}</div>
            <div className="text-[12px] text-[var(--text-muted)] -mt-2">{editing.email}</div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Rol"
                value={editForm.rolFinca}
                onChange={(e) => {
                  const rolFinca = e.target.value as RolFinca;
                  setEditForm({ ...editForm, rolFinca });
                }}
                options={ROL_FINCA_OPTIONS}
              />
              <Select
                label="Finca con acceso"
                value={editForm.fincaId}
                onChange={(e) => setEditForm({ ...editForm, fincaId: e.target.value })}
                options={fincas.map((f) => ({ value: f.id, label: f.nombre }))}
              />
            </div>
            {editForm.rolFinca === "LECTURA" && (
              <p className="text-[11px] text-[var(--text-muted)] -mt-1">
                Este rol solo puede consultar — nunca crear, editar ni borrar, sin importar qué menús marques abajo.
              </p>
            )}
            <div>
              <label className="block text-[12px] font-medium text-[var(--text-secondary)] mb-1.5">
                Menús a los que puede ingresar
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {MODULOS_DASHBOARD.map((mod) => (
                  <label key={mod.key} className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                    <input
                      type="checkbox"
                      checked={editForm.modulos.includes(mod.key)}
                      onChange={() => setEditForm({ ...editForm, modulos: toggleModulo(editForm.modulos, mod.key) })}
                    />
                    {mod.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button loading={editLoading} onClick={handleGuardarEdicion}>Guardar cambios</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: eliminar colaborador */}
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Remover colaborador" size="sm">
        {deleting && (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--text-secondary)]">
              ¿Remover a <strong>{deleting.nombre ?? deleting.email}</strong> de tu organización? Pierde acceso
              inmediatamente a todas tus fincas y se borra el registro. Su cuenta no se elimina, solo el acceso.
              Si prefieres conservar el historial y solo suspender su acceso temporalmente, usa <strong>Inactivar</strong> en vez de esto.
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setDeleting(null)}>Cancelar</Button>
              <Button variant="danger" loading={deletingLoading} onClick={handleEliminar}>Remover</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
