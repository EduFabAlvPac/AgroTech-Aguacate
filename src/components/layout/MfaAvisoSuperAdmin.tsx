"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, X } from "lucide-react";

/**
 * ADR-011 Sprint 6 — "aviso primero, bloqueo después" (decisión explícita
 * del usuario): el ADR pide MFA obligatorio para Super Admin, pero HOY hay
 * una sola cuenta Super Admin real en producción — bloquear el login de
 * entrada arriesgaba dejar al propio dueño sin poder entrar si algo salía
 * mal en el enrolamiento el día del deploy. Este banner es la versión
 * blanda: se sigue pudiendo entrar sin MFA, con un recordatorio visible
 * hasta que lo active. Una vez activo (`mfaHabilitado`), `auth.ts` SÍ lo
 * exige siempre en el login — ver MENSAJE_MFA_REQUERIDO.
 *
 * El "cerrar" solo oculta el banner mientras dure esta sesión de
 * navegación (el layout de (dashboard) no se remonta entre rutas, así que
 * dura toda la visita) — no hay preferencia persistida a propósito: no debe
 * desaparecer para siempre sin haber activado MFA.
 */
export function MfaAvisoSuperAdmin() {
  const [cerrado, setCerrado] = useState(false);
  if (cerrado) return null;

  return (
    <div
      role="status"
      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[12px] font-medium"
      style={{ backgroundColor: "var(--agro-amber)", color: "var(--agro-amber-dark)" }}
    >
      <ShieldAlert size={15} aria-hidden="true" className="shrink-0" />
      <span>
        Como Super Admin, activa la verificación en dos pasos para proteger tu cuenta —{" "}
        <Link href="/dashboard/configuracion?tab=seguridad" className="underline font-semibold">
          activar ahora
        </Link>
      </span>
      <button
        type="button"
        onClick={() => setCerrado(true)}
        aria-label="Cerrar aviso"
        className="ml-1 shrink-0 hover:opacity-70"
      >
        <X size={14} />
      </button>
    </div>
  );
}
