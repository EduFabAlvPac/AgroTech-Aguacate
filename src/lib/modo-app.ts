import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "./db";
import {
  ANCHO_PANTALLA_COOKIE,
  VISITA_COMPLETA_COOKIE,
  parsearAnchoCookie,
  resolverModoRuta,
  type RolAutoDefault,
} from "./vista-preferida";

/**
 * Orquestación server-only para Fase 3/4/5 de ADR-006: lee la preferencia
 * persistida del usuario + el rol (Fase 4) + la cookie de ancho (Fase 3,
 * respaldo) + la "visita puntual" a modo completo (Fase 5), y resuelve qué
 * conjunto de componentes (completo/simple) le corresponde. Envuelta en
 * `cache()` de React — tanto (dashboard)/layout.tsx (para elegir el
 * envoltorio: sidebar vs. header+nav inferior) como cada page.tsx
 * bifurcada (para elegir el contenido) llaman a esta función en el mismo
 * request; sin `cache()` se repetirían las consultas dos veces por carga
 * de página.
 *
 * La lógica de resolución en sí (resolverModoRuta/resolverVistaAuto) vive
 * en vista-preferida.ts como funciones puras — este archivo es solo el
 * "pegamento" con cookies()/Prisma.
 */
export const resolverModoApp = cache(async (userId: string): Promise<"simple" | "completa"> => {
  const [user, cookieStore] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { vistaPreferida: true, esSuperAdmin: true } }),
    cookies(),
  ]);
  const vistaPreferida = user?.vistaPreferida ?? "AUTO";
  const visitaCompletaForzada = cookieStore.get(VISITA_COMPLETA_COOKIE)?.value === "1";

  // El rol (Fase 4) y la cookie de ancho (Fase 3) solo importan cuando la
  // preferencia es AUTO — regla explícita: no tocar el comportamiento de
  // SIMPLE/COMPLETA explícitos. La visita puntual (Fase 5) es la única
  // excepción a esa regla, por diseño — ver resolverModoRuta.
  let rolDefault: RolAutoDefault = null;
  if (vistaPreferida === "AUTO" && !visitaCompletaForzada) {
    rolDefault = user?.esSuperAdmin ? "completa" : await resolverRolAutoDefault(userId);
  }

  const anchoCookie = parsearAnchoCookie(cookieStore.get(ANCHO_PANTALLA_COOKIE)?.value);
  return resolverModoRuta(vistaPreferida, rolDefault, anchoCookie, visitaCompletaForzada);
});

/**
 * Solo la cookie (sin consultar `User`) — usada por (dashboard)/layout.tsx
 * para decidir si muestra el banner "Estás en modo completo temporalmente
 * · Volver a modo simple" (VolverModoSimple.tsx). Deliberadamente no usa
 * `cache()`: es una lectura de cookie, no una consulta a BD, no hay nada
 * que deduplicar.
 */
export async function estaEnVisitaCompletaPuntual(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(VISITA_COMPLETA_COOKIE)?.value === "1";
}

/**
 * Solo la cookie de ancho (sin consultar `User`) — usada por
 * (dashboard)/layout.tsx junto con estaEnVisitaCompletaPuntual() para saber
 * si debe montar el <Sidebar> de escritorio completo o un envoltorio
 * mínimo (banner + contenido, sin sidebar) durante una visita puntual en
 * celular. Bug real reportado por el usuario (2026-08-15): el <Sidebar>
 * completo, como drawer superpuesto sobre un viewport de teléfono, quedaba
 * "atascado" — solo se cerraba tocando fuera de un gesto que un usuario
 * nuevo no tiene por qué conocer. Fuera de esta visita puntual (preferencia
 * COMPLETA explícita, o AUTO resolviendo a completa) el Sidebar se sigue
 * viendo igual que siempre, incluso en celular — es la elección informada
 * de alguien que sí quiere el modo denso.
 */
export async function anchoEsMovil(): Promise<boolean> {
  const cookieStore = await cookies();
  return parsearAnchoCookie(cookieStore.get(ANCHO_PANTALLA_COOKIE)?.value) === "movil";
}

/**
 * Default de "Automático" por rol (Fase 4, ADR-006) — auditado contra el
 * RBAC real, no el diseño objetivo de ADR-004 (ver checkpoint de Fase 4):
 *
 * - esSuperAdmin ya se resuelve arriba, sin consulta (viene en el mismo
 *   SELECT de User que ya se necesitaba para vistaPreferida).
 * - esOwner: misma consulta/criterio que ya usa auth.ts para calcular
 *   session.user.esOwner (findFirst de Membresia rol=OWNER, aceptada,
 *   activa) — no se lee de la sesión aquí porque revocar OWNER debe surtir
 *   efecto sin esperar a que expire el JWT, mismo motivo que ya documenta
 *   requireSuperAdmin() en authz.ts.
 * - ADMIN_FINCA / COLABORADOR: primera membresía activa/aceptada del
 *   usuario (mismo criterio de "primera" que ya usan resolverFincaActiva/
 *   fincaIdsAccesibles en este proyecto — no hay hoy un mecanismo de
 *   "organización activa" explícito, y en el modelo actual de 1
 *   organización por usuario esto es inequívoco en la práctica).
 * - INVERSIONISTA / COMPRADOR / sin membresía: sin default — cae al
 *   respaldo por ancho. Confirmado auditando el código real: ningún flujo
 *   de invitación/membresía asigna estos roles hoy (cero resultados
 *   buscando `Membresia.rol: "INVERSIONISTA"/"COMPRADOR"` en cualquier
 *   `create`), y Comprador accede exclusivamente vía /portal/[token]
 *   (público, sin getServerSession) — este código nunca se ejecuta para
 *   ellos de todas formas.
 */
async function resolverRolAutoDefault(userId: string): Promise<RolAutoDefault> {
  const [esOwner, membresia] = await Promise.all([
    db.membresia.findFirst({
      where: { userId, rol: "OWNER", aceptada: true, activa: true },
      select: { id: true },
    }),
    db.membresia.findFirst({
      where: { userId, aceptada: true, activa: true },
      select: { rol: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (esOwner) return "completa";
  if (membresia?.rol === "ADMIN_FINCA") return "completa";
  if (membresia?.rol === "COLABORADOR") return "simple";
  return null;
}
