"use client";

import { useState } from "react";
import { Plus, User, Trash2, ShieldCheck, Wrench, Eye, Pencil, Power, PowerOff, Save, Users as UsersIcon, SlidersHorizontal } from "lucide-react";
import { Button, Modal, Input, Select, EmptyState } from "@/components/ui";
import toast from "react-hot-toast";
import type { RolOrganizacion } from "@prisma/client";
import { MODULOS_DASHBOARD, type PlantillasModulos } from "@/lib/modulos";

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
  ADMIN: { bg: "#E6F1FB", color: "#185FA5" },
  OPERARIO: { bg: "#EAF3DE", color: "#3B6D11" },
  LECTURA: { bg: "#F1EFE8", color: "#5F5E5A" },
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

const emptyForm = {
  nombre: "",
  email: "",
  password: "",
  rolFinca: "OPERARIO" as RolFinca,
  fincaId: "",
};

export function EquipoClient({
  miembros: initial,
  fincas,
  plantillasIniciales,
}: {
  miembros: MiembroData[];
  fincas: FincaOption[];
  plantillasIniciales: PlantillasModulos;
}) {
  const [tab, setTab] = useState<"miembros" | "roles">("miembros");
  const [miembros, setMiembros] = useState(initial);
  const [plantillas, setPlantillas] = useState(plantillasIniciales);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(() => ({ ...emptyForm, fincaId: fincas[0]?.id ?? "" }));
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<MiembroData | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editLoading, setEditLoading] = useState(false);

  const [deleting, setDeleting] = useState<MiembroData | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [guardandoRol, setGuardandoRol] = useState<RolFinca | null>(null);

  function toggleModulo<T>(list: T[], key: T): T[] {
    return list.includes(key) ? list.filter((m) => m !== key) : [...list, key];
  }

  const handleGuardarPlantilla = async (rol: RolFinca) => {
    setGuardandoRol(rol);
    try {
      const res = await fetch("/api/equipo/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol, modulos: plantillas[rol] }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Error al guardar");
      }
      toast.success("Plantilla guardada — aplica a las próximas personas que agregues con este rol.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setGuardandoRol(null);
    }
  };

  const handleAgregar = async () => {
    if (!form.email.trim()) return toast.error("El email es requerido");
    if (!form.fincaId) return toast.error("Selecciona la finca a la que tendrá acceso");
    setLoading(true);
    try {
      const res = await fetch("/api/equipo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al agregar");
      setMiembros((prev) => [
        {
          id: json.data.id,
          nombre: json.data.nombre,
          email: json.data.email,
          rol: json.data.rol,
          activa: true,
          fincas: [{
            fincaId: form.fincaId,
            nombre: fincas.find((f) => f.id === form.fincaId)?.nombre ?? "?",
            rol: form.rolFinca,
            modulos: plantillas[form.rolFinca],
          }],
        },
        ...prev,
      ]);
      toast.success("Colaborador agregado — comparte sus credenciales por WhatsApp o en persona.");
      setShowModal(false);
      setForm({ ...emptyForm, fincaId: fincas[0]?.id ?? "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al agregar");
    } finally {
      setLoading(false);
    }
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
    });
    setEditing(m);
  };

  const handleGuardarEdicion = async () => {
    if (!editing) return;
    if (!editForm.fincaId) return toast.error("Selecciona la finca con acceso");
    setEditLoading(true);
    try {
      const res = await fetch(`/api/equipo/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rolFinca: editForm.rolFinca, fincaId: editForm.fincaId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");
      setMiembros((prev) =>
        prev.map((m) =>
          m.id === editing.id
            ? {
                ...m,
                rol: editForm.rolFinca === "ADMIN" ? "ADMIN_FINCA" : "COLABORADOR",
                fincas: [{
                  fincaId: editForm.fincaId,
                  nombre: fincas.find((f) => f.id === editForm.fincaId)?.nombre ?? "?",
                  rol: editForm.rolFinca,
                  modulos: plantillas[editForm.rolFinca],
                }],
              }
            : m
        )
      );
      toast.success("Cambios guardados");
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleActiva = async (m: MiembroData) => {
    setTogglingId(m.id);
    try {
      const nuevaActiva = !m.activa;
      const res = await fetch(`/api/equipo/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activa: nuevaActiva }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Error al actualizar");
      }
      setMiembros((prev) => prev.map((x) => (x.id === m.id ? { ...x, activa: nuevaActiva } : x)));
      toast.success(nuevaActiva ? "Colaborador reactivado" : "Colaborador desactivado — no podrá iniciar sesión en tus fincas hasta que lo reactives.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    } finally {
      setTogglingId(null);
    }
  };

  const handleEliminar = async () => {
    if (!deleting) return;
    setDeletingLoading(true);
    try {
      const res = await fetch(`/api/equipo/${deleting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Error al eliminar");
      }
      setMiembros((prev) => prev.filter((m) => m.id !== deleting.id));
      toast.success("Colaborador removido");
      setDeleting(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeletingLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 p-1 bg-[var(--surface-page)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)]">
          {[
            { id: "miembros" as const, label: "Miembros", icon: UsersIcon },
            { id: "roles" as const, label: "Roles y permisos", icon: SlidersHorizontal },
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
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Agregar colaborador
          </Button>
        )}
      </div>

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
                      <span className="badge text-[10px] font-medium rounded-full px-2 py-0.5" style={{ background: "#F1EFE8", color: "#5F5E5A" }}>
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
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-red-50 transition-colors flex-shrink-0"
                  aria-label="Remover colaborador"
                  title="Eliminar"
                >
                  <Trash2 size={14} className="text-[var(--text-muted)] hover:text-red-500" />
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
          <p className="text-[12px] text-[var(--text-muted)] -mt-1">
            No hay envío de correo automático — crea la cuenta aquí y comparte el email/contraseña con la persona por
            WhatsApp o en persona. Si el email ya tiene cuenta en AgroTech, se agrega directamente sin pedir contraseña.
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
              onChange={(e) => setForm({ ...form, rolFinca: e.target.value as RolFinca })}
              options={ROL_FINCA_OPTIONS}
            />
            <Select
              label="Finca con acceso"
              value={form.fincaId}
              onChange={(e) => setForm({ ...form, fincaId: e.target.value })}
              options={fincas.map((f) => ({ value: f.id, label: f.nombre }))}
            />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] -mt-1">
            Los menús que va a ver dependen del rol elegido — configúralos en la pestaña{" "}
            <strong>Roles y permisos</strong>.
            {form.rolFinca === "LECTURA" && " Este rol, además, solo puede consultar — nunca crear, editar ni borrar."}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleAgregar}>Agregar</Button>
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
            <p className="text-[11px] text-[var(--text-muted)] -mt-1">
              Los menús que ve dependen del rol elegido — configúralos en la pestaña <strong>Roles y permisos</strong>.
              {editForm.rolFinca === "LECTURA" && " Este rol, además, solo puede consultar — nunca crear, editar ni borrar."}
            </p>
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
