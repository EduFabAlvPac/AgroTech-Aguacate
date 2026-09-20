import crypto from "node:crypto";

/**
 * Tokens de un solo uso para verificación de correo / reset de contraseña
 * (Fase 1 SaaS, Tanda 2) — 32 bytes de entropía (256 bits), más que los 24
 * bytes (192 bits) que ya usa `EnlaceCompartido.token` (src/app/api/enlaces/
 * route.ts) porque estos son credenciales de acceso a una cuenta, no un
 * enlace de solo lectura para un comprador.
 */
export function generarToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

const UNA_HORA_MS = 60 * 60 * 1000;

/** Estándar de la industria: la ventana de reset de contraseña es más corta
 * que la de verificación de correo — es más sensible (da acceso a la
 * cuenta), así que el costo de que expire "demasiado rápido" pesa menos que
 * el de dejarla abierta mucho tiempo. */
export function expiraEnHoras(horas: number): Date {
  return new Date(Date.now() + horas * UNA_HORA_MS);
}

export function tokenExpirado(expira: Date | null): boolean {
  return !expira || expira < new Date();
}

/**
 * Reenvío de verificación/reset: si ya hay un token VIGENTE se reutiliza en vez
 * de emitir uno nuevo. Antes cada "Reenviar" generaba un token distinto e
 * invalidaba los correos anteriores — quien pulsaba dos veces, o abría el
 * primer correo, encontraba "Enlace inválido" con un enlace perfectamente
 * recién enviado. Reutilizar mantiene válidos todos los correos que siguen
 * dentro de su ventana de expiración.
 */
export function tokenVigenteOGenerar(
  actual: string | null,
  expira: Date | null,
  horas: number,
): { token: string; expira: Date; esNuevo: boolean } {
  if (actual && expira && !tokenExpirado(expira)) return { token: actual, expira, esNuevo: false };
  return { token: generarToken(), expira: expiraEnHoras(horas), esNuevo: true };
}
