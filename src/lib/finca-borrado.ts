/**
 * Reglas de borrado de una finca — UNA sola fuente para la Server Action
 * (`eliminarFinca`) y la ruta `DELETE /api/fincas/[id]` (antes cada una tenía
 * su copia y ninguna explicaba qué bloqueaba el borrado).
 *
 * Decisión de producto (2026-09-24): una finca con datos NO se borra en
 * cascada. Se **bloquea con un mensaje claro** que dice exactamente qué la
 * bloquea y qué hacer — así nadie pierde historial financiero por un toque.
 * Lo que bloquea de verdad en la base son los gastos y presupuestos (FK
 * obligatoria sin cascada); los lotes se bloquean por regla de negocio.
 * Antes el usuario solo veía "Error al eliminar la finca" / "Error interno".
 */
import { Prisma } from "@prisma/client";
import { db } from "./db";

export interface DependenciasFinca {
  lotes: number;
  cultivos: number;
  gastos: number;
  presupuestos: number;
  ingresos: number;
  jornales: number;
}

export interface ResultadoBorradoFinca {
  permitido: boolean;
  mensaje?: string;
  /** "UNICA" = última finca de la organización; "DEPENDENCIAS" = tiene datos. */
  motivo?: "UNICA" | "DEPENDENCIAS";
}

function plural(n: number, singular: string, pluralTxt: string): string {
  return `${n} ${n === 1 ? singular : pluralTxt}`;
}

/** Núcleo puro (sin BD): decide y redacta. */
export function evaluarReglasBorradoFinca(
  nombre: string,
  dep: DependenciasFinca,
  opts: { esUltimaFincaDeLaOrganizacion: boolean; esSuperAdmin: boolean }
): ResultadoBorradoFinca {
  // Proteger a un dueño de quedarse sin ninguna finca. El Super Admin (soporte
  // de plataforma, limpieza de datos de prueba) queda exento.
  if (opts.esUltimaFincaDeLaOrganizacion && !opts.esSuperAdmin) {
    return {
      permitido: false,
      motivo: "UNICA",
      mensaje: `No puedes eliminar «${nombre}» porque es la única finca de tu organización. Crea otra finca primero si quieres reemplazarla.`,
    };
  }

  const partes: string[] = [];
  if (dep.lotes > 0) partes.push(plural(dep.lotes, "lote", "lotes"));
  if (dep.cultivos > 0) partes.push(plural(dep.cultivos, "cultivo", "cultivos"));
  if (dep.gastos > 0) partes.push(plural(dep.gastos, "gasto", "gastos"));
  if (dep.presupuestos > 0) partes.push(plural(dep.presupuestos, "presupuesto", "presupuestos"));
  if (dep.ingresos > 0) partes.push(plural(dep.ingresos, "ingreso", "ingresos"));
  if (dep.jornales > 0) partes.push(plural(dep.jornales, "jornal", "jornales"));

  if (partes.length === 0) return { permitido: true };

  const pasos: string[] = [];
  if (dep.lotes > 0 || dep.cultivos > 0) pasos.push("los lotes y cultivos desde Cultivos o el Mapa");
  if (dep.gastos > 0 || dep.ingresos > 0 || dep.jornales > 0 || dep.presupuestos > 0) {
    pasos.push("los gastos, ingresos, jornales y presupuestos desde Finanzas");
  }
  return {
    permitido: false,
    motivo: "DEPENDENCIAS",
    mensaje: `No se puede eliminar «${nombre}» porque todavía tiene ${partes.join(", ")}. Elimina primero ${pasos.join(" y ")} y vuelve a intentarlo.`,
  };
}

/** Cuenta lo que depende de la finca y aplica las reglas. */
export async function evaluarBorradoFinca(fincaId: string, esSuperAdmin: boolean): Promise<ResultadoBorradoFinca & { nombre: string; organizacionId: string | null }> {
  const finca = await db.finca.findUnique({ where: { id: fincaId }, select: { id: true, nombre: true, organizacionId: true } });
  if (!finca) throw new Error("FINCA_NO_ENCONTRADA");

  const enFinca = { lote: { fincaId } };
  const [lotes, cultivos, gastos, presupuestos, ingresos, jornales, fincasDeLaOrg] = await Promise.all([
    db.lote.count({ where: { fincaId } }),
    db.cultivo.count({ where: enFinca }),
    db.gasto.count({ where: { fincaId } }),
    db.presupuesto.count({ where: { fincaId } }),
    db.ingreso.count({ where: { cultivo: enFinca } }),
    db.jornal.count({ where: { OR: [{ lote: { fincaId } }, { cultivo: enFinca }] } }),
    finca.organizacionId ? db.finca.count({ where: { organizacionId: finca.organizacionId } }) : Promise.resolve(2),
  ]);

  return {
    ...evaluarReglasBorradoFinca(
      finca.nombre,
      { lotes, cultivos, gastos, presupuestos, ingresos, jornales },
      { esUltimaFincaDeLaOrganizacion: fincasDeLaOrg <= 1, esSuperAdmin }
    ),
    nombre: finca.nombre,
    organizacionId: finca.organizacionId,
  };
}

/** Mensaje humano para un error de Prisma al borrar; null si no se reconoce. */
export function mensajeErrorBorrado(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003" || error.code === "P2014") {
      return "No se puede eliminar porque todavía tiene registros asociados (gastos, presupuestos u otros datos). Elimínalos primero e inténtalo de nuevo.";
    }
    if (error.code === "P2025") return "Ese registro ya no existe (quizá ya fue eliminado). Actualiza la página.";
  }
  return null;
}
