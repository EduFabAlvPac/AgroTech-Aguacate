"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { signOut } from "next-auth/react";
import { LogOut, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import type { VistaPreferida } from "@prisma/client";
import { actualizarPerfil, type ConfigActionState } from "@/app/(dashboard)/dashboard/configuracion/config-actions";
import { VistaPreferidaSwitch } from "@/components/shared/VistaPreferidaSwitch";

interface PerfilSimpleClientProps {
  user: { name: string | null; email: string; telefono: string | null; vistaPreferida: VistaPreferida } | null;
}

const initialState: ConfigActionState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 rounded-full text-[13px] font-semibold disabled:opacity-60"
      style={{ background: "var(--color-brand)", color: "white" }}
    >
      {pending ? "Guardando..." : "Guardar cambios"}
    </button>
  );
}

export function PerfilSimpleClient({ user }: PerfilSimpleClientProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [telefono, setTelefono] = useState(user?.telefono ?? "");
  const [state, formAction] = useActionState(actualizarPerfil, initialState);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.ok) toast.success("Perfil actualizado");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Estado de error: sesión válida pero sin registro de usuario (no debería
  // ocurrir en operación normal — defensivo, no un caso de "vacío").
  if (!user) {
    return (
      <div className="px-4 py-10 text-center">
        <AlertTriangle size={28} className="mx-auto mb-2" style={{ color: "var(--color-negative)" }} />
        <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>No se pudo cargar tu perfil</p>
        <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>Intenta recargar la página.</p>
      </div>
    );
  }

  const inicial = (user.name ?? user.email ?? "U").trim().charAt(0).toUpperCase();

  return (
    <div className="px-4 py-4 space-y-4">
      {/* ── Avatar + nombre + email — "vacío" = usuario sin name todavía ── */}
      <div className="flex flex-col items-center text-center py-2">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-[28px] font-bold mb-3"
          style={{ background: "var(--color-brand-bg)", color: "var(--color-brand-dark)" }}
        >
          {inicial}
        </div>
        <div className="text-[17px] font-bold" style={{ color: "var(--text-primary)" }}>{user.name || "Sin nombre"}</div>
        <div className="text-[13px]" style={{ color: "var(--text-muted)" }}>{user.email}</div>
      </div>

      {/* ── Formulario: reutiliza actualizarPerfil (Fase 1, configuracion) ── */}
      <form action={formAction} className="rounded-2xl p-4 space-y-3" style={{ border: "1px solid var(--border-subtle)" }}>
        <div>
          <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Nombre</label>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className="w-full h-11 px-3 rounded-xl text-[14px]"
            style={{ border: "1px solid var(--border-default)" }}
          />
        </div>
        <div>
          <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Teléfono</label>
          <input
            name="telefono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej: 3001234567"
            className="w-full h-11 px-3 rounded-xl text-[14px]"
            style={{ border: "1px solid var(--border-default)" }}
          />
        </div>
        <div>
          <label className="text-[12px] font-medium block mb-1" style={{ color: "var(--text-secondary)" }}>Email</label>
          <input
            value={user.email}
            disabled
            className="w-full h-11 px-3 rounded-xl text-[14px] opacity-60"
            style={{ border: "1px solid var(--border-default)", background: "var(--surface-page)" }}
          />
          <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>El email no se puede cambiar aquí.</p>
        </div>
        <SubmitButton />
      </form>

      {/* ── Vista de la aplicación (Fase 3, ADR-006) — mismo componente que
          Configuración (modo completo), ver VistaPreferidaSwitch.tsx ── */}
      <div className="rounded-2xl p-4 space-y-2.5" style={{ border: "1px solid var(--border-subtle)" }}>
        <div>
          <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>Vista de la aplicación</div>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
            Automático elige según el tamaño de tu pantalla.
          </p>
        </div>
        <VistaPreferidaSwitch vistaActual={user.vistaPreferida} />
      </div>

      <button
        onClick={() => {
          setCerrandoSesion(true);
          signOut({ callbackUrl: "/login" });
        }}
        disabled={cerrandoSesion}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-[13px] font-semibold disabled:opacity-60"
        style={{ background: "var(--color-negative-bg)", color: "var(--color-negative)" }}
      >
        <LogOut size={16} /> {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
      </button>
    </div>
  );
}
