"use client";

import { useState } from "react";
import { Plus, User, Trash2, ShieldCheck, Wrench, Pencil, Power, PowerOff } from "lucide-react";
import { Button, Modal, Input, Select, EmptyState } from "@/components/ui";
import toast from "react-hot-toast";
import type { RolOrganizacion } from "@prisma/client";
import { MODULOS_DASHBOARD, modulosPorDefecto, type ModuloKey } from "@/lib/modulos";

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

const ROL_LABELS: Record<string, string> = {
  ADMIN_FINCA: "Administrador de finca",
  COLABORADOR: "Colaborador",
};

const ROL_COLORS: Record<string, { bg: string; color: string }> = {
  ADMIN_FINCA: { bg: "#E6F1FB", color: "#185FA5" },
  COLABORADOR: { bg: "#EAF3DE", color: "#3B6D11" },
};

const emptyForm = {
  nombre: "",
  email: "",
  password: "",
  rol: "COLABORADOR" as RolOrganizacion,
  fincaId: "",
  modulos: modulosPorDefecto("OPERARIO") as string[],
};

export function EquipoClient({ miembros: initial, fincas }: { miembros: MiembroData[]; fincas: FincaOption[] }) {
  const [miembros, setMiembros] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(() => ({ ...emptyForm, fincaId: fincas[0]?.id ?? "" }));
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<MiembroData | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editLoading, setEditLoading] = useState(false);

  const [deleting, setDeleting] = useState<MiembroData | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggleModulo = (list: string[], key: string) =>
    list.includes(key) ? list.filter((m) => m !== key) : [...list, key];

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
            rol: form.rol === "ADMIN_FINCA" ? "ADMIN" : "OPERARIO",
            modulos: form.modulos,
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
    setEditForm({
      nombre: m.nombre ?? "",
      email: m.email,
      password: "",
      rol: m.rol,
      fincaId: acceso?.fincaId ?? fincas[0]?.id ?? "",
      modulos: acceso?.modulos && acceso.modulos.length > 0 ? acceso.modulos : modulosPorDefecto(m.rol === "ADMIN_FINCA" ? "ADMIN" : "OPERARIO"),
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
        body: JSON.stringify({ rol: editForm.rol, fincaId: editForm.fincaId, modulos: editForm.modulos }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al guardar");
      setMiembros((prev) =>
        prev.map((m) =>
          m.id === editing.id
            ? {
                ...m,
                rol: editForm.rol,
                fincas: [{
                  fincaId: editForm.fincaId,
                  nombre: fincas.find((f) => f.id === editForm.fincaId)?.nombre ?? "?",
                  rol: editForm.rol === "ADMIN_FINCA" ? "ADMIN" : "OPERARIO",
                  modulos: editForm.modulos,
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
      <div className="flex justify-end">
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} /> Agregar colaborador
        </Button>
      </div>

      {miembros.length === 0 ? (
        <EmptyState
          icon={<User size={28} />}
          title="Sin colaboradores todavía"
          description="Agrega administradores o colaboradores de campo para que puedan registrar actividades y gastos en tus fincas."
          action={<Button onClick={() => setShowModal(true)}><Plus size={14} /> Agregar colaborador</Button>}
        />
      ) : (
        <div className="space-y-2">
          {miembros.map((m) => (
            <div key={m.id} className={`card p-4 flex items-center justify-between flex-wrap gap-3 ${!m.activa ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-agro-50 flex items-center justify-center flex-shrink-0">
                  {m.rol === "ADMIN_FINCA" ? <ShieldCheck size={18} className="text-agro-400" /> : <Wrench size={18} className="text-agro-400" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">{m.nombre ?? m.email}</span>
                    <span
                      className="badge text-[10px] font-medium rounded-full px-2 py-0.5"
                      style={{ background: ROL_COLORS[m.rol].bg, color: ROL_COLORS[m.rol].color }}
                    >
                      {ROL_LABELS[m.rol] ?? m.rol}
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
          ))}
        </div>
      )}

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
              value={form.rol}
              onChange={(e) => {
                const rol = e.target.value as RolOrganizacion;
                setForm({ ...form, rol, modulos: modulosPorDefecto(rol === "ADMIN_FINCA" ? "ADMIN" : "OPERARIO") });
              }}
              options={[
                { value: "COLABORADOR", label: "Colaborador de campo" },
                { value: "ADMIN_FINCA", label: "Administrador de finca" },
              ]}
            />
            <Select
              label="Finca con acceso"
              value={form.fincaId}
              onChange={(e) => setForm({ ...form, fincaId: e.target.value })}
              options={fincas.map((f) => ({ value: f.id, label: f.nombre }))}
            />
          </div>
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
                value={editForm.rol}
                onChange={(e) => {
                  const rol = e.target.value as RolOrganizacion;
                  setEditForm({ ...editForm, rol });
                }}
                options={[
                  { value: "COLABORADOR", label: "Colaborador de campo" },
                  { value: "ADMIN_FINCA", label: "Administrador de finca" },
                ]}
              />
              <Select
                label="Finca con acceso"
                value={editForm.fincaId}
                onChange={(e) => setEditForm({ ...editForm, fincaId: e.target.value })}
                options={fincas.map((f) => ({ value: f.id, label: f.nombre }))}
              />
            </div>
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
