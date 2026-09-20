"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

type Estado = "pendiente" | "cargando" | "listo" | "error";

/**
 * Botón "Confirmar mi correo" de /verificar/[token]. La verificación se hace
 * con un POST al pulsarlo — nunca al abrir la página — para que un filtro de
 * seguridad que "previsualiza" el enlace del correo no la consuma antes que la
 * persona (ver el comentario de /api/auth/verificar/[token]).
 */
export function ConfirmarVerificacion({ token }: { token: string }) {
  const [estado, setEstado] = useState<Estado>("pendiente");
  const [mensajeError, setMensajeError] = useState("");

  const confirmar = async () => {
    setEstado("cargando");
    try {
      const res = await fetch(`/api/auth/verificar/${encodeURIComponent(token)}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMensajeError(data.error || "No se pudo verificar el correo.");
        setEstado("error");
        return;
      }
      setEstado("listo");
    } catch {
      setMensajeError("No se pudo verificar el correo. Revisa tu conexión e intenta de nuevo.");
      setEstado("error");
    }
  };

  if (estado === "listo") {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-2">
        <CheckCircle2 size={40} className="text-agro-600" />
        <p className="text-[13px] text-[var(--text-secondary)]">Tu cuenta ya está activa. Ya puedes iniciar sesión.</p>
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
    <div className="flex flex-col items-center text-center gap-3 py-2">
      {estado === "error" && (
        <>
          <XCircle size={40} className="text-red-500" />
          <p className="text-[13px] text-[var(--text-secondary)]">{mensajeError}</p>
        </>
      )}
      {estado !== "error" && (
        <p className="text-[13px] text-[var(--text-secondary)]">Toca el botón para activar tu cuenta.</p>
      )}
      <button
        type="button"
        onClick={confirmar}
        disabled={estado === "cargando"}
        className="w-full py-2.5 bg-agro-600 hover:bg-agro-800 disabled:opacity-60 text-white text-[14px] font-semibold rounded-[var(--radius-md)] transition-colors"
      >
        {estado === "cargando" ? "Confirmando..." : estado === "error" ? "Intentar de nuevo" : "Confirmar mi correo"}
      </button>
    </div>
  );
}
