/**
 * Sesiones revocables — ADR-011 Sprint 1 (ver docs/ADR-011-notas-de-implementacion.md §6).
 *
 * IMPORTANTE — esto NO es "sesión en base de datos" en el sentido de
 * NextAuth (adapter con estrategia `database`): confirmado en el código
 * instalado (`node_modules/next-auth/core/routes/callback.js`), el
 * provider Credentials de NextAuth v4 SIEMPRE emite JWT — existe incluso un
 * error `UnsupportedStrategy` para el caso contrario. El JWT sigue siendo
 * la fuente real de la sesión; esta tabla es una LISTA DE REVOCACIÓN: el
 * JWT lleva un `sid` (id de sesión, campo `token.sid` en src/lib/auth.ts),
 * y esta tabla dice si ese `sid` sigue siendo válido.
 *
 * Guardado con hash (nunca el `sid` crudo) — mismo criterio que
 * src/lib/tokens.ts para los tokens de verificación/reset.
 */
import { db } from "./db";
import { generarToken, hashToken } from "./tokens";

const SESION_MAX_AGE_DIAS = 30; // mismo valor que ya heredaba por default de NextAuth — ahora explícito (ver auth.ts)
export const SESION_MAX_AGE_SEGUNDOS = SESION_MAX_AGE_DIAS * 24 * 60 * 60;
const SESION_MAX_AGE_MS = SESION_MAX_AGE_SEGUNDOS * 1000;

/** Ventana de "confío en lo que ya dice el JWT sin volver a consultar la
 * base" — evita que cada llamada a la API (varias por carga de página en un
 * dashboard) le pegue a Postgres. El costo es que revocar a alguien tarda
 * hasta este tiempo en surtir efecto, no es instantáneo — trade-off
 * explícito, ver notas de implementación. */
export const SESION_REVALIDACION_STALENESS_MS = 5 * 60 * 1000;

export interface ContextoSesion {
  ip?: string;
  userAgent?: string;
}

/** Crea la fila de sesión y devuelve el `sid` CRUDO (va al JWT) — después
 * de esto, solo su hash vive en la base. */
export async function crearSesion(userId: string, contexto: ContextoSesion = {}): Promise<{ sid: string; expiraEn: Date }> {
  const sid = generarToken();
  const expiraEn = new Date(Date.now() + SESION_MAX_AGE_MS);
  await db.sesion.create({
    data: {
      userId,
      tokenHash: hashToken(sid),
      ipAddress: contexto.ip,
      userAgent: contexto.userAgent,
      expiraEn,
    },
  });
  return { sid, expiraEn };
}

/** ¿Este `sid` (crudo, el que trae el JWT) sigue vivo? — ni revocado ni vencido. */
export async function sesionEsValida(sid: string): Promise<boolean> {
  const sesion = await db.sesion.findUnique({
    where: { tokenHash: hashToken(sid) },
    select: { revocadaEn: true, expiraEn: true },
  });
  if (!sesion) return false;
  if (sesion.revocadaEn) return false;
  if (sesion.expiraEn < new Date()) return false;
  return true;
}

/** Cierre de sesión normal (events.signOut en auth.ts) — limpia esa única fila. */
export async function revocarSesionPorRawId(sid: string): Promise<void> {
  await db.sesion.updateMany({
    where: { tokenHash: hashToken(sid), revocadaEn: null },
    data: { revocadaEn: new Date() },
  });
}

/**
 * Revoca TODAS las sesiones activas de un usuario — desactivar/remover a un
 * colaborador en Equipo (equipo-actions.ts), o el derecho de supresión de
 * la Ley 1581 (aunque ahí ya alcanza con el onDelete: Cascade al borrar el
 * User). Simplificación deliberada para este sprint: no distingue de qué
 * organización viene la sesión (Sesion no tiene ese scope todavía — el
 * modelo de datos de hoy es 1 organización por usuario en la práctica); con
 * multi-membresía real (Sprint 3) esto tendría que acotarse por org.
 */
export async function revocarSesionesDeUsuario(userId: string): Promise<void> {
  await db.sesion.updateMany({
    where: { userId, revocadaEn: null },
    data: { revocadaEn: new Date() },
  });
}
