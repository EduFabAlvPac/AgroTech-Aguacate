import { cookies } from "next/headers";
import { db } from "./db";
import { fincaIdsAccesibles } from "./db/scoped";
import type { AuthzSession } from "./authz";

/**
 * Selector de finca activa — funcionalidad de fincas (multi-finca real).
 * Antes toda la app asumía "la primera finca del usuario" (`db.finca.
 * findFirst({where:{userId}})`, repetido en ~15 archivos); con esto el
 * usuario elige con cuál finca está trabajando y esa elección se respeta en
 * todas las páginas/rutas, en vez de una elección arbitraria del backend.
 *
 * Persistencia: cookie httpOnly (no hay razón para que JS del cliente la
 * lea directamente — el selector recibe el valor actual como prop desde el
 * server component). Se revalida contra `fincaIdsAccesibles()` en cada
 * lectura, así que un valor viejo (finca a la que ya no tiene acceso) nunca
 * se usa silenciosamente.
 */
export const FINCA_ACTIVA_COOKIE = "agrotech_finca_activa";

/**
 * Sentinel para usar como `fincaId: fincaActivaId ?? SIN_FINCA_SENTINEL` en
 * queries: cuando no hay finca activa, un `fincaId: undefined` haría que
 * Prisma IGNORE el filtro (devolviendo TODO en vez de nada). Ningún registro
 * real tendrá jamás este id, así que el filtro coincide con cero filas.
 */
export const SIN_FINCA_SENTINEL = "__sin_finca_activa__";

export type FincaActivaResult = {
  /** IDs de finca a los que el usuario tiene acceso — "ALL" para Super Admin. */
  fincaIds: string[] | "ALL";
  /** La finca "activa" resuelta: cookie válida, o la primera accesible. */
  fincaActivaId: string | null;
};

export async function resolverFincaActiva(
  session: AuthzSession | null | undefined
): Promise<FincaActivaResult> {
  const fincaIds = await fincaIdsAccesibles(session);
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(FINCA_ACTIVA_COOKIE)?.value;

  if (fincaIds === "ALL") {
    if (cookieValue) {
      const existe = await db.finca.findUnique({ where: { id: cookieValue }, select: { id: true } });
      if (existe) return { fincaIds, fincaActivaId: existe.id };
    }
    const primera = await db.finca.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
    return { fincaIds, fincaActivaId: primera?.id ?? null };
  }

  if (fincaIds.length === 0) return { fincaIds, fincaActivaId: null };
  if (cookieValue && fincaIds.includes(cookieValue)) return { fincaIds, fincaActivaId: cookieValue };
  return { fincaIds, fincaActivaId: fincaIds[0] };
}

/** Atajo para rutas que solo necesitan el id de la finca activa (o null). */
export async function getFincaActivaId(session: AuthzSession | null | undefined): Promise<string | null> {
  return (await resolverFincaActiva(session)).fincaActivaId;
}
