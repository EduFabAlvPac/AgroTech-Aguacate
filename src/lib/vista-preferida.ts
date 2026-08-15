import type { VistaPreferida } from "@prisma/client";

/**
 * Resolución de "Automático" (Fase 3, ADR-006) — decisión evaluada y
 * aprobada explícitamente con el usuario antes de implementar (ver
 * checkpoint de Fase 3): cookie de ancho conocido + corrección única del
 * lado del cliente, SIN detección por User-Agent (heurística de bajo valor
 * una vez que la cookie converge). Ver AnchoPantallaSync.tsx para la parte
 * cliente que escribe la cookie.
 */

/** Cookie no-httpOnly (la escribe JS del cliente) — solo guarda un bucket
 * de ancho, nunca el ancho exacto en píxeles (no hace falta más precisión
 * que "por debajo o por encima del breakpoint"). */
export const ANCHO_PANTALLA_COOKIE = "agrotech_ancho_pantalla";

/** Mismo breakpoint que usa el resto del proyecto para mobile-first (Tailwind `md`). */
export const BREAKPOINT_MOVIL_PX = 768;

export type AnchoBucket = "movil" | "escritorio";

/**
 * Puro — sin cookies() ni window aquí, para poder testear sin mocks de
 * Next.js y para que la Fase 4 (criterio de rol) solo tenga que extender
 * esta función, no el mecanismo de cookie/switch que la rodea.
 *
 * Sin cookie todavía (primera visita real de un dispositivo): sesgo hacia
 * "movil" — el público objetivo de AgroTech es predominantemente móvil
 * (ver CLAUDE.md), minimiza la probabilidad de necesitar la corrección de
 * AnchoPantallaSync en el caso común.
 */
export function resolverVistaAuto(anchoConocido: AnchoBucket | null): "simple" | "completa" {
  if (anchoConocido === "escritorio") return "completa";
  return "simple";
}

/**
 * Combina la preferencia persistida del usuario (SIMPLE/COMPLETA/AUTO) con
 * el bucket de ancho conocido (cookie) para decidir qué conjunto de
 * componentes monta una ruta real.
 */
export function resolverModoRuta(
  vistaPreferida: VistaPreferida,
  anchoConocido: AnchoBucket | null
): "simple" | "completa" {
  if (vistaPreferida === "SIMPLE") return "simple";
  if (vistaPreferida === "COMPLETA") return "completa";
  return resolverVistaAuto(anchoConocido);
}

/** Lee la cookie de ancho desde un string de cookie de Next.js
 * (`cookies().get(...)?.value`) — valida que sea uno de los dos valores
 * esperados, cualquier otra cosa (cookie corrupta/manipulada) se trata
 * como "sin cookie". */
export function parsearAnchoCookie(valor: string | undefined): AnchoBucket | null {
  if (valor === "movil" || valor === "escritorio") return valor;
  return null;
}
