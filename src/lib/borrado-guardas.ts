/**
 * Guardas de borrado de lote y cultivo — una sola fuente para las Server
 * Actions y las rutas API gemelas (misma lógica que `finca-borrado.ts`).
 *
 * Por qué existen: en la base, Ingreso/Jornal referencian cultivo/lote de forma
 * OPCIONAL (SetNull), así que borrar un cultivo NO fallaba: dejaba sus ingresos
 * y jornales huérfanos, invisibles en los reportes y sin finca a la cual
 * pertenecer (Ingreso no tiene `fincaId`). Y el aporte de los inversionistas
 * (InversionCultivo → RetornoInversion) se borraba EN CASCADA. Pérdida de datos
 * financieros silenciosa. Decisión de producto (2026-09-24): bloquear con un
 * mensaje claro que diga qué hay que resolver primero.
 *
 * Los gastos NO bloquean: tienen `fincaId` propio, quedan en la finca y solo
 * pierden el vínculo con el cultivo.
 */
import { db } from "./db";
import { registrarAuditoria } from "./audit";

export interface DependenciasCultivo {
  ingresos: number;
  jornales: number;
  inversiones: number;
}

function plural(n: number, s: string, p: string): string {
  return `${n} ${n === 1 ? s : p}`;
}

/** Núcleo puro: null = se puede borrar; texto = motivo del bloqueo. */
export function motivoBloqueoBorrado(
  que: "cultivo" | "lote",
  nombre: string,
  dep: DependenciasCultivo
): string | null {
  const partes: string[] = [];
  if (dep.ingresos > 0) partes.push(plural(dep.ingresos, "ingreso", "ingresos"));
  if (dep.jornales > 0) partes.push(plural(dep.jornales, "jornal", "jornales"));
  if (dep.inversiones > 0) partes.push(plural(dep.inversiones, "inversión de un inversionista", "inversiones de inversionistas"));
  if (partes.length === 0) return null;

  const pasos: string[] = [];
  if (dep.ingresos > 0 || dep.jornales > 0) pasos.push("los ingresos y jornales desde Finanzas");
  if (dep.inversiones > 0) pasos.push("las inversiones desde Inversionistas");
  return `No se puede eliminar ${que === "lote" ? "el lote" : "el cultivo"} «${nombre}» porque tiene ${partes.join(", ")}. Si lo borras, ese historial financiero se perdería. Elimina primero ${pasos.join(" y ")} y vuelve a intentarlo.`;
}

export async function motivoBloqueoBorradoCultivo(cultivoId: string, nombre: string): Promise<string | null> {
  const [ingresos, jornales, inversiones] = await Promise.all([
    db.ingreso.count({ where: { cultivoId } }),
    db.jornal.count({ where: { cultivoId } }),
    db.inversionCultivo.count({ where: { cultivoId } }),
  ]);
  return motivoBloqueoBorrado("cultivo", nombre, { ingresos, jornales, inversiones });
}

/** Un lote arrastra a sus cultivos (cascada): cuenta lo de todos ellos + jornales del propio lote. */
export async function motivoBloqueoBorradoLote(loteId: string, nombre: string): Promise<string | null> {
  const enLote = { cultivo: { loteId } };
  const [ingresos, jornales, inversiones] = await Promise.all([
    db.ingreso.count({ where: enLote }),
    db.jornal.count({ where: { OR: [{ loteId }, enLote] } }),
    db.inversionCultivo.count({ where: enLote }),
  ]);
  return motivoBloqueoBorrado("lote", nombre, { ingresos, jornales, inversiones });
}

/** Deja rastro de un borrado en la auditoría de la organización de la finca. */
export async function auditarBorrado(params: {
  actorId: string;
  actorEmail?: string | null;
  accion: string;
  recurso: string;
  recursoId: string;
  fincaId?: string | null;
  detalle?: Record<string, unknown>;
}): Promise<void> {
  try {
    const finca = params.fincaId
      ? await db.finca.findUnique({ where: { id: params.fincaId }, select: { organizacionId: true } })
      : null;
    await registrarAuditoria({
      actorId: params.actorId,
      actorEmail: params.actorEmail ?? undefined,
      accion: params.accion,
      detalle: params.detalle ?? {},
      organizacionId: finca?.organizacionId ?? null,
      recurso: params.recurso,
      recursoId: params.recursoId,
    });
  } catch (e) {
    // La auditoría no debe deshacer un borrado ya hecho.
    console.error("[auditarBorrado]", e);
  }
}
