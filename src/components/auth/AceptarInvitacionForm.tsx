"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";

type Estado = "pendiente" | "cargando" | "listo" | "error";

interface AceptarInvitacionFormProps {
  token: string;
  email: string;
  /** Si ya existe una cuenta con este correo Y la sesión activa es esa misma
   * cuenta (la página ya lo verificó) — cambia qué campos pide el formulario. */
  yaTieneCuenta: boolean;
}

/**
 * Formulario de aceptación de /invitacion/[token] (ADR-011 Sprint 3). Dos
 * variantes:
 *  - `yaTieneCuenta`: solo un botón "Aceptar invitación" — la cuenta ya
 *    existe y ya está autenticada con ese correo (verificado en la página).
 *  - si no: pide nombre + contraseña para crear la cuenta al aceptar.
 *
 * POST en ambos casos, nunca al abrir la página (mismo criterio que
 * ConfirmarVerificacion.tsx).
 */
export function AceptarInvitacionForm({ token, email, yaTieneCuenta }: AceptarInvitacionFormProps) {
  const [estado, setEstado] = useState<Estado>("pendiente");
  const [mensajeError, setMensajeError] = useState("");
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const aceptar = async () => {
    if (!yaTieneCuenta && (!nombre.trim() || password.length < 8)) {
      setMensajeError("Ingresa tu nombre y una contraseña de al menos 8 caracteres.");
      setEstado("error");
      return;
    }
    setEstado("cargando");
    try {
      const res = await fetch(`/api/invitaciones/${encodeURIComponent(token)}/aceptar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(yaTieneCuenta ? {} : { nombre, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMensajeError(data.error || "No se pudo aceptar la invitación.");
        setEstado("error");
        return;
      }
      setEstado("listo");
    } catch {
      setMensajeError("No se pudo aceptar la invitación. Revisa tu conexión e intenta de nuevo.");
      setEstado("error");
    }
  };

  if (estado === "listo") {
    if (yaTieneCuenta) {
      // La sesión activa no se entera de la membresía nueva hasta el
      // próximo login (las membresías van embebidas en el JWT, ver
      // resolverClaimsSesion() en auth.ts) — se pide reentrar, mismo
      // criterio que el resto de la app cuando algo cambia el rol/acceso.
      return (
        <div className="flex flex-col items-center text-center gap-3 py-2">
          <CheckCircle2 size={40} className="text-agro-600" />
          <p className="text-[13px] text-[var(--text-secondary)]">
            Listo — ya eres parte de esta organización. Cierra sesión y vuelve a entrar para verla.
          </p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full py-2.5 bg-agro-600 hover:bg-agro-800 text-white text-[14px] font-semibold rounded-[var(--radius-md)] transition-colors"
          >
            Cerrar sesión y volver a entrar
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <CheckCircle2 size={40} className="text-agro-600" />
        <p className="text-[13px] text-[var(--text-secondary)]">Tu cuenta quedó creada. Ya puedes iniciar sesión.</p>
        <Link
          href="/login"
          className="w-full text-center py-2.5 bg-agro-600 hover:bg-agro-800 text-white text-[14px] font-semibold rounded-[var(--radius-md)] transition-colors"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-2">
      {estado === "error" && (
        <div className="flex flex-col items-center text-center gap-2">
          <XCircle size={32} className="text-red-500" />
          <p className="text-[13px] text-[var(--text-secondary)]">{mensajeError}</p>
        </div>
      )}

      {!yaTieneCuenta && (
        <>
          <p className="text-[12px] text-[var(--text-muted)] text-center">
            Crea tu cuenta con <strong>{email}</strong> para aceptar.
          </p>
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Tu nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Juan Pérez"
              className="w-full px-4 py-2.5 text-[13px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Contraseña</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-4 pr-10 py-2.5 text-[13px] border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </>
      )}

      {yaTieneCuenta && (
        <p className="text-[13px] text-[var(--text-secondary)] text-center">
          Confirmá que quieres unirte con <strong>{email}</strong>.
        </p>
      )}

      <button
        type="button"
        onClick={aceptar}
        disabled={estado === "cargando"}
        className="w-full py-2.5 bg-agro-600 hover:bg-agro-800 disabled:opacity-60 text-white text-[14px] font-semibold rounded-[var(--radius-md)] transition-colors"
      >
        {estado === "cargando" ? "Aceptando..." : "Aceptar invitación"}
      </button>
    </div>
  );
}
