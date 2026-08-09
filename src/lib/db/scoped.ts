/**
 * Repositorio scoped — filtrado de datos multi-tenant a nivel de aplicación.
 * Ver CLAUDE.md §2.4 y docs/REQUERIMIENTOS.md §4.4 / ADR-005.
 *
 * Decisión: no RLS nativo de Postgres en esta fase (frágil con el pooling de
 * Neon + Prisma). En su lugar, todo acceso a un modelo tenant-scoped desde una
 * API route debe pasar por `scopedDb(session)` en vez de `db` directo, para
 * que el filtro de organización no dependa de que cada desarrollador lo
 * recuerde en cada query.
 *
 * Estado: skeleton de Fase 0 con los 3 modelos de ejemplo del ADR-005 (finca,
 * lote, cultivo). Ampliar a gasto/ingreso/presupuesto/jornal/comprador/alerta
 * es trabajo de Fase 2, ruta por ruta, junto con `requireAccess()` — ver
 * `src/lib/authz.ts`. Aún NO se exige su uso en las rutas existentes.
 */
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthzSession } from "@/lib/authz";

async function organizacionIdsDeSesion(session: AuthzSession | null | undefined): Promise<string[] | "ALL"> {
  if (!session?.user?.id) return [];

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { esSuperAdmin: true } });
  if (user?.esSuperAdmin) return "ALL";

  const membresias = await db.membresia.findMany({
    where: { userId: session.user.id, aceptada: true },
    select: { organizacionId: true },
  });
  return membresias.map((m) => m.organizacionId);
}

/**
 * Devuelve un cliente con métodos de lectura/escritura pre-filtrados por las
 * organizaciones a las que pertenece `session.user`. Los IDs de organización
 * se resuelven una sola vez por instancia (memoizados), no en cada llamada.
 */
export function scopedDb(session: AuthzSession | null | undefined) {
  let cache: Promise<string[] | "ALL"> | null = null;
  const orgIds = () => (cache ??= organizacionIdsDeSesion(session));

  async function fincaWhere(): Promise<Prisma.FincaWhereInput> {
    const ids = await orgIds();
    return ids === "ALL" ? {} : { organizacionId: { in: ids } };
  }
  async function loteWhere(): Promise<Prisma.LoteWhereInput> {
    const ids = await orgIds();
    return ids === "ALL" ? {} : { finca: { organizacionId: { in: ids } } };
  }
  async function cultivoWhere(): Promise<Prisma.CultivoWhereInput> {
    const ids = await orgIds();
    return ids === "ALL" ? {} : { lote: { finca: { organizacionId: { in: ids } } } };
  }

  return {
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
