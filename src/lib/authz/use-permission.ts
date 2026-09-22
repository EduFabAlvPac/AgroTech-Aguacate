"use client";

import { useSession } from "next-auth/react";
import { can, type MembresiaContexto, type ObjetivoAutorizacion } from "./policies";
import type { Permiso } from "./permissions";

/**
 * ADR-011 Sprint 2 — hook de cliente para ocultar botones/menús sin permiso
 * (outcome del Sprint 2 en el roadmap del ADR, §10). Evalúa `can()` contra
 * las membresías que `resolverClaimsSesion()` (src/lib/auth.ts) ya embebió en
 * el JWT/sesión al loguearse — sin ida y vuelta al servidor.
 *
 * **No reemplaza a `requireAccess()`.** Es UX (ocultar lo que de todas formas
 * el servidor rechazaría), nunca la autorización real — la API vuelve a
 * decidir con `requireAccess()` en cada request, exactamente igual que hoy.
 * Alguien con las devtools abiertas puede hacer que este hook devuelva
 * `true` y no logra nada: el servidor sigue negando.
 *
 * Sin usuarios todavía (ningún componente de la UI actual condiciona nada
 * por rol) — queda listo para la próxima función que lo necesite, no se
 * fuerza su adopción retroactiva en componentes existentes.
 *
 * Uso: `const puedeBorrar = usePermission("lote:delete", { fincaId });`
 */
export function usePermission(permiso: Permiso, objetivo: ObjetivoAutorizacion = {}): boolean {
  const { data: session } = useSession();
  const membresias = ((session?.user as { membresias?: MembresiaContexto[] } | undefined)?.membresias ??
    []) as MembresiaContexto[];
  return can(membresias, permiso, objetivo);
}
