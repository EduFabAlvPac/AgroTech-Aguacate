/**
 * Repositorio scoped — filtrado de datos multi-tenant a nivel de aplicación.
 * Ver CLAUDE.md §2.4 y docs/REQUERIMIENTOS.md §4.4 / ADR-005.
 *
 * Decisión: no RLS nativo de Postgres en esta fase (frágil con el pooling de
 * Neon + Prisma). En su lugar, todo acceso a un modelo tenant-scoped desde una
 * API route debe pasar por `scopedDb(session)`/`fincaIdsAccesibles(session)`
 * en vez de `db` directo, para que el filtro de organización no dependa de
 * que cada desarrollador lo recuerde en cada query.
 *
 * Fase 2: a diferencia del skeleton de Fase 0 (que solo filtraba por
 * pertenencia a la organización, sin distinguir rol), esto ya respeta el
 * scoping fino real: el OWNER ve todas las fincas de su organización; un
 * ADMIN_FINCA/COLABORADOR solo ve las fincas donde tiene un FincaAcceso
 * explícito — igual que ya exige `requireAccess()` en src/lib/authz.ts para
 * mutaciones. Este helper es el equivalente para listados (GET).
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthzSession } from "@/lib/authz";

/**
 * IDs de Finca a las que `session.user` tiene acceso de lectura como mínimo.
 * "ALL" para Super Admin (sin restricción). Array vacío si no pertenece a
 * ninguna organización o no tiene FincaAcceso a ninguna finca.
 */
export async function fincaIdsAccesibles(session: AuthzSession | null | undefined): Promise<string[] | "ALL"> {
  if (!session?.user?.id) return [];
  const userId = session.user.id;

  const user = await db.user.findUnique({ where: { id: userId }, select: { esSuperAdmin: true } });
  if (user?.esSuperAdmin) return "ALL";

  const membresias = await db.membresia.findMany({
    where: { userId, aceptada: true, activa: true },
    select: { organizacionId: true, rol: true },
  });
  if (membresias.length === 0) return [];

  const orgIdsComoOwner = membresias.filter((m) => m.rol === "OWNER").map((m) => m.organizacionId);
  const orgIdsOtros = membresias.filter((m) => m.rol !== "OWNER").map((m) => m.organizacionId);

  const [fincasComoOwner, accesos] = await Promise.all([
    orgIdsComoOwner.length > 0
      ? db.finca.findMany({ where: { organizacionId: { in: orgIdsComoOwner } }, select: { id: true } })
      : Promise.resolve([]),
    orgIdsOtros.length > 0
      ? db.fincaAcceso.findMany({
          where: { userId, finca: { organizacionId: { in: orgIdsOtros } } },
          select: { fincaId: true },
        })
      : Promise.resolve([]),
  ]);

  return [...new Set([...fincasComoOwner.map((f) => f.id), ...accesos.map((a) => a.fincaId)])];
}

/**
 * Devuelve un cliente con métodos de lectura pre-filtrados por las fincas
 * accesibles a `session.user`. El resultado de fincaIdsAccesibles se resuelve
 * una sola vez por instancia (memoizado), no en cada llamada.
 */
export function scopedDb(session: AuthzSession | null | undefined) {
  let cache: Promise<string[] | "ALL"> | null = null;
  const fincaIds = () => (cache ??= fincaIdsAccesibles(session));

  async function fincaWhere(): Promise<Prisma.FincaWhereInput> {
    const ids = await fincaIds();
    return ids === "ALL" ? {} : { id: { in: ids } };
  }
  async function loteWhere(): Promise<Prisma.LoteWhereInput> {
    const ids = await fincaIds();
    return ids === "ALL" ? {} : { fincaId: { in: ids } };
  }
  async function cultivoWhere(): Promise<Prisma.CultivoWhereInput> {
    const ids = await fincaIds();
    return ids === "ALL" ? {} : { lote: { fincaId: { in: ids } } };
  }

  return {
    fincaIds,
    fincaWhere,
    loteWhere,
    cultivoWhere,
    finca: {
      findMany: async (args: Prisma.FincaFindManyArgs = {}) =>
        db.finca.findMany({ ...args, where: { AND: [await fincaWhere(), args.where ?? {}] } }),
      findFirst: async (args: Prisma.FincaFindFirstArgs = {}) =>
        db.finca.findFirst({ ...args, where: { AND: [await fincaWhere(), args.where ?? {}] } }),
    },
    lote: {
      findMany: async (args: Prisma.LoteFindManyArgs = {}) =>
        db.lote.findMany({ ...args, where: { AND: [await loteWhere(), args.where ?? {}] } }),
      findFirst: async (args: Prisma.LoteFindFirstArgs = {}) =>
        db.lote.findFirst({ ...args, where: { AND: [await loteWhere(), args.where ?? {}] } }),
    },
    cultivo: {
      findMany: async (args: Prisma.CultivoFindManyArgs = {}) =>
        db.cultivo.findMany({ ...args, where: { AND: [await cultivoWhere(), args.where ?? {}] } }),
      findFirst: async (args: Prisma.CultivoFindFirstArgs = {}) =>
        db.cultivo.findFirst({ ...args, where: { AND: [await cultivoWhere(), args.where ?? {}] } }),
    },
  };
}
