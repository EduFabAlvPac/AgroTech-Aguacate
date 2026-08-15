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
 * Default de "Automático" derivado del rol (Fase 4, ADR-006) — `null`
 * cuando el rol no tiene un default claro (INVERSIONISTA/COMPRADOR, hoy
 * inalcanzables en sesión real — ver checkpoint de Fase 4; o sin membresía
 * activa), caso en el que el ancho de pantalla decide como respaldo. La
 * resolución de qué rol tiene cada usuario (consulta a `Membresia`/
 * `esSuperAdmin`/`esOwner`) vive en modo-app.ts — esta función solo recibe
 * el resultado ya resuelto, para seguir siendo pura y testeable.
 */
export type RolAutoDefault = "simple" | "completa" | null;

/**
 * Puro — sin cookies() ni window aquí, para poder testear sin mocks de
 * Next.js. El rol manda sobre el ancho de pantalla (decisión confirmada
 * explícitamente con el usuario en el checkpoint de Fase 4 — la razón
 * original para incorporar el rol fue justamente que el ancho es la
 * variable equivocada; dejar que el viewport le gane al rol reintroduciría
 * ese problema). El ancho solo decide cuando `rolDefault` es `null`.
 *
 * Sin cookie todavía Y sin rol con default claro (primera visita real de
 * un dispositivo, rol sin default): sesgo hacia "movil" — el público
 * objetivo de AgroTech es predominantemente móvil (ver CLAUDE.md), minimiza
 * la probabilidad de necesitar la corrección de AnchoPantallaSync.
 */
export function resolverVistaAuto(rolDefault: RolAutoDefault, anchoConocido: AnchoBucket | null): "simple" | "completa" {
  if (rolDefault) return rolDefault;
  if (anchoConocido === "escritorio") return "completa";
  return "simple";
}

/**
 * Combina la preferencia persistida del usuario (SIMPLE/COMPLETA/AUTO) con
 * el default por rol y el bucket de ancho conocido (cookie, respaldo) para
 * decidir qué conjunto de componentes monta una ruta real. Preferencias
 * explícitas (SIMPLE/COMPLETA) no se tocan — ni rol ni ancho entran a jugar
 * para ellas, exactamente igual que en Fase 3.
 */
export function resolverModoRuta(
  vistaPreferida: VistaPreferida,
  rolDefault: RolAutoDefault,
  anchoConocido: AnchoBucket | null
): "simple" | "completa" {
  if (vistaPreferida === "SIMPLE") return "simple";
  if (vistaPreferida === "COMPLETA") return "completa";
  return resolverVistaAuto(rolDefault, anchoConocido);
}

/** Lee la cookie de ancho desde un string de cookie de Next.js
 * (`cookies().get(...)?.value`) — valida que sea uno de los dos valores
 * esperados, cualquier otra cosa (cookie corrupta/manipulada) se trata
 * como "sin cookie". */
export function parsearAnchoCookie(valor: string | undefined): AnchoBucket | null {
  if (valor === "movil" || valor === "escritorio") return valor;
  return null;
}
