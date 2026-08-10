"use client";

import { useState } from "react";
import { Plus, User, Trash2, ShieldCheck, Wrench } from "lucide-react";
import { Button, Modal, Input, Select, EmptyState } from "@/components/ui";
import toast from "react-hot-toast";
import type { RolOrganizacion } from "@prisma/client";

interface FincaOption {
  id: string;
  nombre: string;
}

interface MiembroData {
  id: string;
  nombre: string | null;
  email: string;
  rol: RolOrganizacion;
  fincas: { fincaId: string; nombre: string; rol: string }[];
}

const ROL_LABELS: Record<string, string> = {
  ADMIN_FINCA: "Administrador de finca",
  COLABORADOR: "Colaborador",
};

const ROL_COLORS: Record<string, { bg: string; color: string }> = {
  ADMIN_FINCA: { bg: "#E6F1FB", color: "#185FA5" },
  COLABORADOR: { bg: "#EAF3DE", color: "#3B6D11" },
};

const emptyForm = { nombre: "", email: "", password: "", rol: "COLABORADOR" as RolOrganizacion, fincaId: "" };

export function EquipoClient({ miembros: initial, fincas }: { miembros: MiembroData[]; fincas: FincaOption[] }) {
  const [miembros, setMiembros] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(() => ({ ...emptyForm, fincaId: fincas[0]?.id ?? "" }));
  const [loading, setLoading] = useState(false);

  const [deleting, setDeleting] = useState<MiembroData | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

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
          fincas: [{ fincaId: form.fincaId, nombre: fincas.find((f) => f.id === form.fincaId)?.nombre ?? "?", rol: form.rol === "ADMIN_FINCA" ? "ADMIN" : "OPERARIO" }],
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
            <div key={m.id} className="card p-4 flex items-center justify-between flex-wrap gap-3">
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
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {m.email}
                    {m.fincas.length > 0 && ` · Acceso a: ${m.fincas.map((f) => f.nombre).join(", ")}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleting(m)}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-red-50 transition-colors flex-shrink-0"
                aria-label="Remover colaborador"
              >
                <Trash2 size={14} className="text-[var(--text-muted)] hover:text-red-500" />
              </button>
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
              onChange={(e) => setForm({ ...form, rol: e.target.value as RolOrganizacion })}
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button loading={loading} onClick={handleAgregar}>Agregar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal: eliminar colaborador */}
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Remover colaborador" size="sm">
        {deleting && (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--text-secondary)]">
              ¿Remover a <strong>{deleting.nombre ?? deleting.email}</strong> de tu organización? Pierde acceso
              inmediatamente a todas tus fincas. Su cuenta no se elimina, solo el acceso.
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
