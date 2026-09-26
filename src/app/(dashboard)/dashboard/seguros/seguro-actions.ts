"use server";

/**
 * Server Actions de Seguros agrícolas. GermIA no vende seguros: el productor
 * registra la póliza que ya contrató, la asocia a sus cultivos y, cuando ocurre
 * un evento, registra el siniestro sobre el cultivo.
 *
 * Aislamiento: la finca NUNCA viene del cliente — se deduce de los cultivos en
 * la BD, se exige que TODOS pertenezcan a la misma finca y `requireAccess`
 * autoriza contra esa finca (evita asociar un seguro al cultivo de otra finca).
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { polizaSchema, siniestroSchema, siniestroSeguimientoSchema } from "@/lib/validations";
import { polizaCubre } from "@/lib/seguros";
import { mensajeErrorBorrado } from "@/lib/finca-borrado";
import { auditarBorrado } from "@/lib/borrado-guardas";
import { RIESGO_LABELS } from "@/types";
import type { z } from "zod";

export interface SeguroActionState {
  ok?: boolean;
  error?: string;
  id?: string;
}

class ErrorNegocio extends Error {}

function primerError(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Datos inválidos";
}

function revalidar() {
  revalidatePath("/dashboard/seguros");
  revalidatePath("/dashboard/cultivos");
  revalidatePath("/dashboard/finanzas");
}

/** Devuelve la finca común de los cultivos, o lanza un Error con mensaje claro. */
async function fincaComun(cultivoIds: string[]): Promise<string> {
  const ids = [...new Set(cultivoIds)];
  const cultivos = await db.cultivo.findMany({ where: { id: { in: ids } }, select: { id: true, lote: { select: { fincaId: true } } } });
  if (cultivos.length !== ids.length) throw new ErrorNegocio("Alguno de los cultivos elegidos ya no existe. Actualiza la página.");
  const fincas = new Set(cultivos.map((c) => c.lote.fincaId));
  if (fincas.size !== 1) throw new ErrorNegocio("Una póliza solo puede cubrir cultivos de una misma finca.");
  return [...fincas][0];
}

async function auditar(session: { user: { id: string; email?: string | null } }, accion: string, recurso: string, recursoId: string, fincaId: string, detalle: Record<string, unknown>) {
  await auditarBorrado({ actorId: session.user.id, actorEmail: session.user.email, accion, recurso, recursoId, fincaId, detalle });
}

function manejar(nombre: string, error: unknown): SeguroActionState {
  if (error instanceof AuthzError) return { error: error.message };
  if (error instanceof ErrorNegocio) return { error: error.message };
  console.error(`[${nombre}]`, error);
  return { error: mensajeErrorBorrado(error) ?? "No se pudo completar la operación. Inténtalo de nuevo." };
}

// ─── Pólizas ─────────────────────────────────────────────────────────────────

export async function crearPoliza(input: unknown): Promise<SeguroActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  const parsed = polizaSchema.safeParse(input);
  if (!parsed.success) return { error: primerError(parsed.error) };
  const v = parsed.data;

  try {
    const fincaId = await fincaComun(v.cultivoIds);
    await requireAccess(session, "seguro", "create", { fincaId });
    const conGasto = !!v.registrarPrimaComoGasto && !!v.prima && v.prima > 0;
    if (conGasto) await requireAccess(session, "gasto", "create", { fincaId });

    const poliza = await db.$transaction(async (tx) => {
      // La prima queda como gasto FIJO de la finca (vinculado al cultivo si es uno solo).
      const gasto = conGasto
        ? await tx.gasto.create({
            data: {
              userId: session.user.id,
              fincaId,
              cultivoId: v.cultivoIds.length === 1 ? v.cultivoIds[0] : null,
              concepto: `Prima seguro agrícola — ${v.aseguradora}`,
              categoria: "OTROS",
              subcategoria: "Seguro agrícola",
              monto: v.prima!,
              tipoGasto: "FIJO",
              fecha: v.fechaInicio,
            },
          })
        : null;
      return tx.polizaSeguro.create({
        data: {
          fincaId,
          aseguradora: v.aseguradora,
          numeroPoliza: v.numeroPoliza || null,
          riesgos: v.riesgos,
          sumaAsegurada: v.sumaAsegurada ?? null,
          prima: v.prima ?? null,
          deduciblePct: v.deduciblePct ?? null,
          fechaInicio: v.fechaInicio,
          fechaFin: v.fechaFin,
          contacto: v.contacto || null,
          notas: v.notas || null,
          gastoId: gasto?.id ?? null,
          creadoPorId: session.user.id,
          cultivos: { create: [...new Set(v.cultivoIds)].map((cultivoId) => ({ cultivoId })) },
        },
      });
    });

    await auditar(session, "poliza.crear", "PolizaSeguro", poliza.id, fincaId, { aseguradora: v.aseguradora, cultivos: v.cultivoIds.length });
    revalidar();
    return { ok: true, id: poliza.id };
  } catch (error) {
    return manejar("crearPoliza", error);
  }
}

export async function editarPoliza(polizaId: string, input: unknown): Promise<SeguroActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  const parsed = polizaSchema.safeParse(input);
  if (!parsed.success) return { error: primerError(parsed.error) };
  const v = parsed.data;

  try {
    const existente = await db.polizaSeguro.findUnique({ where: { id: polizaId }, select: { fincaId: true, gastoId: true } });
    if (!existente) return { error: "Póliza no encontrada" };
    await requireAccess(session, "seguro", "update", { fincaId: existente.fincaId });
    // Los cultivos nuevos deben ser de la MISMA finca de la póliza.
    const fincaNueva = await fincaComun(v.cultivoIds);
    if (fincaNueva !== existente.fincaId) return { error: "Los cultivos deben pertenecer a la finca de la póliza." };

    await db.$transaction(async (tx) => {
      await tx.polizaSeguro.update({
        where: { id: polizaId },
        data: {
          aseguradora: v.aseguradora,
          numeroPoliza: v.numeroPoliza || null,
          riesgos: v.riesgos,
          sumaAsegurada: v.sumaAsegurada ?? null,
          prima: v.prima ?? null,
          deduciblePct: v.deduciblePct ?? null,
          fechaInicio: v.fechaInicio,
          fechaFin: v.fechaFin,
          contacto: v.contacto || null,
          notas: v.notas || null,
        },
      });
      await tx.polizaCultivo.deleteMany({ where: { polizaId } });
      await tx.polizaCultivo.createMany({ data: [...new Set(v.cultivoIds)].map((cultivoId) => ({ polizaId, cultivoId })) });
      // Si la prima ya se había registrado como gasto, se mantiene sincronizada.
      if (existente.gastoId && v.prima && v.prima > 0) {
        await tx.gasto.updateMany({ where: { id: existente.gastoId }, data: { monto: v.prima } });
      }
    });

    await auditar(session, "poliza.editar", "PolizaSeguro", polizaId, existente.fincaId, { aseguradora: v.aseguradora });
    revalidar();
    return { ok: true, id: polizaId };
  } catch (error) {
    return manejar("editarPoliza", error);
  }
}

export async function cancelarPoliza(polizaId: string): Promise<SeguroActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  try {
    const p = await db.polizaSeguro.findUnique({ where: { id: polizaId }, select: { fincaId: true, aseguradora: true, estado: true } });
    if (!p) return { error: "Póliza no encontrada" };
    await requireAccess(session, "seguro", "update", { fincaId: p.fincaId });
    if (p.estado === "CANCELADA") return { ok: true };
    await db.polizaSeguro.update({ where: { id: polizaId }, data: { estado: "CANCELADA" } });
    await auditar(session, "poliza.cancelar", "PolizaSeguro", polizaId, p.fincaId, { aseguradora: p.aseguradora });
    revalidar();
    return { ok: true };
  } catch (error) {
    return manejar("cancelarPoliza", error);
  }
}

export async function eliminarPoliza(polizaId: string): Promise<SeguroActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  try {
    const p = await db.polizaSeguro.findUnique({
      where: { id: polizaId },
      select: { fincaId: true, aseguradora: true, _count: { select: { siniestros: true } } },
    });
    if (!p) return { error: "Póliza no encontrada" };
    await requireAccess(session, "seguro", "delete", { fincaId: p.fincaId });
    if (p._count.siniestros > 0) {
      return {
        error: `No se puede eliminar la póliza de ${p.aseguradora} porque tiene ${p._count.siniestros} ${p._count.siniestros === 1 ? "siniestro registrado" : "siniestros registrados"}. Elimina primero esos siniestros, o cancela la póliza para conservar el historial.`,
      };
    }
    await db.polizaSeguro.delete({ where: { id: polizaId } });
    await auditar(session, "poliza.eliminar", "PolizaSeguro", polizaId, p.fincaId, { aseguradora: p.aseguradora });
    revalidar();
    return { ok: true };
  } catch (error) {
    return manejar("eliminarPoliza", error);
  }
}

// ─── Siniestros ──────────────────────────────────────────────────────────────

export async function crearSiniestro(input: unknown): Promise<SeguroActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  const parsed = siniestroSchema.safeParse(input);
  if (!parsed.success) return { error: primerError(parsed.error) };
  const v = parsed.data;

  try {
    const cultivo = await db.cultivo.findUnique({ where: { id: v.cultivoId }, select: { id: true, lote: { select: { fincaId: true } } } });
    if (!cultivo) return { error: "El cultivo elegido ya no existe. Actualiza la página." };
    const fincaId = cultivo.lote.fincaId;
    await requireAccess(session, "siniestro", "create", { fincaId });

    if (v.polizaId) {
      const poliza = await db.polizaSeguro.findUnique({ where: { id: v.polizaId }, include: { cultivos: { select: { cultivoId: true } } } });
      if (!poliza || poliza.fincaId !== fincaId) return { error: "La póliza elegida no pertenece a la finca de este cultivo." };
      const cubre = polizaCubre(
        { estado: poliza.estado, fechaInicio: poliza.fechaInicio, fechaFin: poliza.fechaFin, riesgos: poliza.riesgos, cultivoIds: poliza.cultivos.map((c) => c.cultivoId) },
        v.cultivoId,
        v.tipo,
        v.fechaEvento
      );
      if (!cubre) {
        return {
          error: `La póliza de ${poliza.aseguradora} no cubre «${RIESGO_LABELS[v.tipo]}» en este cultivo en esa fecha (revisa riesgos, cultivos asociados y vigencia). Si solo quieres dejar evidencia, registra el siniestro sin póliza.`,
        };
      }
    }

    const s = await db.siniestro.create({
      data: {
        fincaId,
        cultivoId: v.cultivoId,
        polizaId: v.polizaId || null,
        tipo: v.tipo,
        fechaEvento: v.fechaEvento,
        descripcion: v.descripcion,
        areaAfectadaHa: v.areaAfectadaHa ?? null,
        porcentajeDanio: v.porcentajeDanio ?? null,
        perdidaEstimada: v.perdidaEstimada ?? null,
        imagenes: v.imagenes,
        notas: v.notas || null,
        creadoPorId: session.user.id,
      },
    });
    await auditar(session, "siniestro.crear", "Siniestro", s.id, fincaId, { tipo: v.tipo, cultivoId: v.cultivoId, conPoliza: !!v.polizaId });
    revalidar();
    return { ok: true, id: s.id };
  } catch (error) {
    return manejar("crearSiniestro", error);
  }
}

export async function actualizarSeguimientoSiniestro(siniestroId: string, input: unknown): Promise<SeguroActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  const parsed = siniestroSeguimientoSchema.safeParse(input);
  if (!parsed.success) return { error: primerError(parsed.error) };
  const v = parsed.data;

  try {
    const s = await db.siniestro.findUnique({ where: { id: siniestroId }, select: { fincaId: true } });
    if (!s) return { error: "Siniestro no encontrado" };
    await requireAccess(session, "siniestro", "update", { fincaId: s.fincaId });

    const pagable = v.estado === "APROBADO" || v.estado === "PAGADO";
    if (!pagable && v.montoIndemnizado) return { error: "El monto indemnizado solo aplica cuando el siniestro está aprobado o pagado." };

    await db.siniestro.update({
      where: { id: siniestroId },
      data: {
        estado: v.estado,
        numeroReclamo: v.numeroReclamo || null,
        fechaReporteAseguradora: v.fechaReporteAseguradora ?? null,
        montoIndemnizado: pagable ? v.montoIndemnizado ?? null : null,
        notas: v.notas || null,
      },
    });
    await auditar(session, "siniestro.actualizar", "Siniestro", siniestroId, s.fincaId, { estado: v.estado });
    revalidar();
    return { ok: true, id: siniestroId };
  } catch (error) {
    return manejar("actualizarSeguimientoSiniestro", error);
  }
}

export async function eliminarSiniestro(siniestroId: string): Promise<SeguroActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  try {
    const s = await db.siniestro.findUnique({ where: { id: siniestroId }, select: { fincaId: true, tipo: true, estado: true } });
    if (!s) return { error: "Siniestro no encontrado" };
    await requireAccess(session, "siniestro", "delete", { fincaId: s.fincaId });
    await db.siniestro.delete({ where: { id: siniestroId } });
    await auditar(session, "siniestro.eliminar", "Siniestro", siniestroId, s.fincaId, { tipo: s.tipo, estado: s.estado });
    revalidar();
    return { ok: true };
  } catch (error) {
    return manejar("eliminarSiniestro", error);
  }
}
