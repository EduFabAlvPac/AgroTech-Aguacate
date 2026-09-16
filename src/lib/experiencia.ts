import { cache } from "react";
import { db } from "./db";

/**
 * Resuelve la experiencia asignada al usuario (ESTANDAR | CAMPESINO) — ver
 * ExperienciaApp en prisma/schema.prisma. Deliberadamente NO vive en
 * src/lib/modo-app.ts/vista-preferida.ts: esta resolución ocurre ANTES de
 * decidir simple/completa, y decide si el usuario ni siquiera entra a ese
 * subsistema (ver guarda en (dashboard)/layout.tsx y
 * src/app/(campesino)/campesino/layout.tsx).
 *
 * Lectura fresca de BD (no del JWT) — igual que esSuperAdmin en las páginas
 * de admin, así revocar el modo Campesino de una cuenta surte efecto sin
 * esperar a que expire el token.
 */
export const obtenerExperienciaUsuario = cache(async (userId: string): Promise<"ESTANDAR" | "CAMPESINO"> => {
  const user = await db.user.findUnique({ where: { id: userId }, select: { experiencia: true } });
  return user?.experiencia ?? "ESTANDAR";
});
