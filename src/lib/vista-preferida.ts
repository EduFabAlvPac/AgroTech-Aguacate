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
 * "Visita puntual" a modo completo (Fase 5, ADR-006, QA de paridad) — un
 * usuario en modo simple (por preferencia SIMPLE explícita o por AUTO) que
 * necesita una función excluida (dibujar un lote, invitar a Equipo,
 * configurar umbrales de alerta...) puede visitar modo completo sin que eso
 * cambie su `vistaPreferida` guardada. Es una cookie corta (no la
 * preferencia persistida en `User`), con máxima precedencia — le gana
 * incluso a SIMPLE explícito, exactamente al revés que el ancho de
 * pantalla, que tiene la precedencia más baja. Ver SalidaModoCompleto.tsx
 * (la escribe) y VolverModoSimple.tsx (la borra).
 */
export const VISITA_COMPLETA_COOKIE = "agrotech_visita_completa";
export const VISITA_COMPLETA_MAX_AGE_S = 30 * 60; // 30 min — red de seguridad si el usuario no vuelve explícitamente

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
 * objetivo de GermIA es predominantemente móvil (ver CLAUDE.md), minimiza
 * la probabilidad de necesitar la corrección de AnchoPantallaSync.
 */
export function resolverVistaAuto(rolDefault: RolAutoDefault, anchoConocido: AnchoBucket | null): "simple" | "completa" {
  if (rolDefault) return rolDefault;
  if (anchoConocido === "escritorio") return "completa";
  return "simple";
}

/**
 * Combina la preferencia persistida del usuario (SIMPLE/COMPLETA/AUTO), el
 * default por rol y el bucket de ancho conocido (cookie, respaldo), y la
 * "visita puntual" a modo completo (Fase 5) para decidir qué conjunto de
 * componentes monta una ruta real.
 *
 * Precedencia (de mayor a menor):
 * 1. `visitaCompletaForzada` — gana incluso sobre SIMPLE explícito. Es la
 *    única excepción a "las preferencias explícitas no se tocan": por
 *    diseño, es precisamente lo que permite visitar modo completo SIN
 *    tocar la preferencia guardada.
 * 2. vistaPreferida SIMPLE/COMPLETA explícito.
 * 3. AUTO → rol, con ancho de pantalla como respaldo.
 */
export function resolverModoRuta(
  vistaPreferida: VistaPreferida,
  rolDefault: RolAutoDefault,
  anchoConocido: AnchoBucket | null,
  visitaCompletaForzada: boolean = false
): "simple" | "completa" {
  if (visitaCompletaForzada) return "completa";
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
