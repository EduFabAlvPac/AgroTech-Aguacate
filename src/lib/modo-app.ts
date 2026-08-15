import { cache } from "react";
import { cookies } from "next/headers";
import { db } from "./db";
import { ANCHO_PANTALLA_COOKIE, parsearAnchoCookie, resolverModoRuta } from "./vista-preferida";

/**
 * Orquestación server-only para Fase 3 de ADR-006: lee la preferencia
 * persistida del usuario + la cookie de ancho, y resuelve qué conjunto de
 * componentes (completo/simple) le corresponde. Envuelta en `cache()` de
 * React — tanto (dashboard)/layout.tsx (para elegir el envoltorio:
 * sidebar vs. header+nav inferior) como cada page.tsx bifurcada (para
 * elegir el contenido) llaman a esta función en el mismo request; sin
 * `cache()` se repetiría la consulta a `User` dos veces por carga de
 * página.
 *
 * La lógica de resolución en sí (resolverModoRuta/resolverVistaAuto) vive
 * en vista-preferida.ts como funciones puras — este archivo es solo el
 * "pegamento" con cookies()/Prisma.
 */
export const resolverModoApp = cache(async (userId: string): Promise<"simple" | "completa"> => {
  const [user, cookieStore] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { vistaPreferida: true } }),
    cookies(),
  ]);
  const anchoCookie = parsearAnchoCookie(cookieStore.get(ANCHO_PANTALLA_COOKIE)?.value);
  return resolverModoRuta(user?.vistaPreferida ?? "AUTO", anchoCookie);
});
