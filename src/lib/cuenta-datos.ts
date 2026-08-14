/**
 * Ley 1581 de 2012 (Colombia) — derecho de acceso y supresión de datos
 * personales. Ver CLAUDE.md §7 y docs/REQUERIMIENTOS.md §3.2.
 */
import { db } from "./db";

/**
 * Recolecta todos los datos que el usuario creó/es dueño directo (scoping
 * por userId, no por organización completa) — derecho de acceso. No incluye
 * datos de otros miembros de una organización compartida, solo lo propio.
 */
export async function exportarDatosUsuario(userId: string) {
  const [user, fincas, gastos, presupuestos, compradores, membresias, fincaAccesos, inversionista, preferencias, usoIa] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, telefono: true, role: true, createdAt: true },
      }),
      db.finca.findMany({
        where: { userId },
        include: {
          lotes: { include: { cultivos: { include: { registros: true } }, analisisSuelo: true } },
        },
      }),
      db.gasto.findMany({ where: { userId } }),
      db.presupuesto.findMany({ where: { userId } }),
      db.comprador.findMany({ where: { userId } }),
      db.membresia.findMany({ where: { userId }, select: { organizacionId: true, rol: true, aceptada: true, activa: true, createdAt: true } }),
      db.fincaAcceso.findMany({ where: { userId }, select: { fincaId: true, rol: true, createdAt: true } }),
      db.inversionista.findFirst({
        where: { userId },
        include: { inversiones: { include: { retornos: true } } },
      }),
      db.userPreferences.findUnique({ where: { userId } }),
      db.usoIaDiario.findMany({ where: { userId }, select: { tipo: true, fecha: true, contador: true } }),
    ]);

  // Ingreso/Jornal no tienen userId propio (se scopean vía cultivo/lote →
  // finca) — se incluyen aparte usando las fincas ya resueltas arriba, para
  // que el export sea completo y no deje por fuera datos financieros reales
  // de la finca del usuario.
  const fincaIds = fincas.map((f) => f.id);
  const [ingresos, jornales] = fincaIds.length
    ? await Promise.all([
        db.ingreso.findMany({ where: { cultivo: { lote: { fincaId: { in: fincaIds } } } } }),
        db.jornal.findMany({
          where: { OR: [{ lote: { fincaId: { in: fincaIds } } }, { cultivo: { lote: { fincaId: { in: fincaIds } } } }] },
        }),
      ])
    : [[], []];

  return {
    generadoEn: new Date().toISOString(),
    perfil: user,
    fincas,
    gastos,
    ingresos,
    presupuestos,
    jornales,
    compradores,
    membresias,
    fincaAccesos,
    inversionista,
    preferencias,
    usoIaDiario: usoIa,
  };
}

/**
 * Determina si el usuario puede eliminar su cuenta de inmediato (self-service,
 * hard delete vía cascade de Prisma) o si requiere una solicitud manual.
 *
 * El único caso inseguro: el usuario es OWNER de una organización con OTROS
 * miembros activos — borrar el User cascadea Finca (onDelete: Cascade) y le
 * quitaría el piso a colaboradores/inversionistas sin su consentimiento. En
 * cualquier otro caso (cuenta sin membresías, o solo COLABORADOR/INVERSIONISTA
 * en organizaciones de alguien más) el cascade solo toca datos propios.
 */
export async function puedeEliminarDeInmediato(
  userId: string
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  const orgsComoOwner = await db.membresia.findMany({
    where: { userId, rol: "OWNER", aceptada: true, activa: true },
    select: { organizacionId: true },
  });

  for (const { organizacionId } of orgsComoOwner) {
    const otrosMiembros = await db.membresia.count({
      where: { organizacionId, userId: { not: userId }, aceptada: true, activa: true },
    });
    if (otrosMiembros > 0) {
      return {
        ok: false,
        motivo:
          "Tu cuenta es dueña de una organización con otros miembros activos (colaboradores o inversionistas). " +
          "Eliminarla de inmediato les quitaría el acceso a sus propios datos sin avisarles. " +
          "Registramos tu solicitud — contáctanos para transferir la organización o coordinar la eliminación.",
      };
    }
  }

  return { ok: true };
}
