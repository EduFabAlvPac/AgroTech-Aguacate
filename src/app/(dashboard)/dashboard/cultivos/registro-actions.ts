"use server";

/**
 * Server Actions — RegistroCultivo (Fase 1, ADR-006). Mismo patrón que
 * lote-actions.ts/cultivo-actions.ts. Incluye la sincronización
 * bidireccional Cultivos↔Finanzas (CLAUDE.md: "No romper el patrón de
 * sincronización bidireccional... es un diferenciador de producto ya
 * funcionando en producción") — se replica EXACTO, no se toca su lógica.
 *
 * Qué revalida cada acción:
 * - crearRegistro     → revalidatePath("/dashboard/cultivos") — y si generó
 *   gasto/ingreso automático, también "/dashboard/finanzas" y "/dashboard"
 *   (KPIs de gastos del mes / gráfica financiera dependen de eso).
 * - actualizarRegistro → revalidatePath("/dashboard/cultivos")
 * - eliminarRegistro   → revalidatePath("/dashboard/cultivos") — el
 *   gasto/ingreso vinculado NO se borra en cascada (comportamiento
 *   preexistente, no se cambia aquí), así que no revalida Finanzas.
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { registroFormSchema } from "@/lib/validations";
import type { RegistroCultivo, Prisma } from "@prisma/client";

const registroUpdateSchema = registroFormSchema.omit({ cultivoId: true }).partial();

async function fetchCultivoConFinca(cultivoId: string) {
  return db.cultivo.findUnique({
    where: { id: cultivoId },
    include: { lote: { select: { fincaId: true } } },
  });
}

async function fetchRegistroConFinca(registroId: string) {
  return db.registroCultivo.findUnique({
    where: { id: registroId },
    include: { cultivo: { include: { lote: { select: { fincaId: true } } } } },
  });
}

export interface RegistroActionState {
  error?: string;
  registro?: RegistroCultivo;
}

function getImagenes(formData: FormData): string[] {
  const raw = formData.get("imagenes");
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const TIPO_TO_CATEGORIA: Record<string, string> = {
  FERTILIZACION: "INSUMOS",
  TRATAMIENTO_PLAGAS: "INSUMOS",
  RIEGO: "AGUA_RIEGO",
  PODA: "MANO_OBRA",
};

export async function crearRegistro(
  cultivoId: string,
  _prev: RegistroActionState,
  formData: FormData
): Promise<RegistroActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const tipo = formData.get("tipo") as string;
  const descripcion = formData.get("descripcion") as string;
  const fecha = formData.get("fecha") as string;

  const parsed = registroFormSchema.safeParse({ tipo, descripcion, fecha, cultivoId });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    const cultivo = await fetchCultivoConFinca(cultivoId);
    if (!cultivo) return { error: "Cultivo no encontrado" };
    await requireAccess(session, "registroCultivo", "create", { fincaId: cultivo.lote.fincaId });

    const imagenes = getImagenes(formData);
    const costo = formData.get("costo");
    const ingresoMonto = formData.get("ingreso");
    const cantidadKg = formData.get("cantidadKg");

    const registro = await db.registroCultivo.create({
      data: {
        cultivoId,
        tipo: parsed.data.tipo,
        descripcion: parsed.data.descripcion,
        fecha: parsed.data.fecha ? new Date(parsed.data.fecha) : new Date(),
        imagenes,
      },
    });

    let huboSyncFinanciero = false;

    // ── Sync: gasto automático para actividades con costo ─────────────────
    if (costo && Number(costo) > 0 && TIPO_TO_CATEGORIA[tipo]) {
      const gasto = await db.gasto.create({
        data: {
          userId: session.user.id,
          fincaId: cultivo.lote.fincaId,
          cultivoId,
          concepto: `${tipo.replace(/_/g, " ")} — ${descripcion.slice(0, 50)}`,
          categoria: TIPO_TO_CATEGORIA[tipo] as Prisma.GastoCreateInput["categoria"],
          monto: Number(costo),
          fecha: parsed.data.fecha ? new Date(parsed.data.fecha) : new Date(),
          notas: "Generado automáticamente desde registro de actividad",
        },
      });
      await db.registroCultivo.update({ where: { id: registro.id }, data: { gastoId: gasto.id } }).catch(() => {});
      huboSyncFinanciero = true;
    }

    // ── Sync: ingreso automático para COSECHA ──────────────────────────────
    if (tipo === "COSECHA" && ingresoMonto && Number(ingresoMonto) > 0) {
      const ingresoCreado = await db.ingreso.create({
        data: {
          cultivoId,
          concepto: `Cosecha — ${descripcion.slice(0, 50)}`,
          monto: Number(ingresoMonto),
          cantidadKg: cantidadKg ? Number(cantidadKg) : null,
          fecha: parsed.data.fecha ? new Date(parsed.data.fecha) : new Date(),
          notas: "Generado automáticamente desde registro de cosecha",
        },
      });
      await db.registroCultivo.update({ where: { id: registro.id }, data: { ingresoId: ingresoCreado.id } }).catch(() => {});
      huboSyncFinanciero = true;
    }

    revalidatePath("/dashboard/cultivos");
    if (huboSyncFinanciero) {
      revalidatePath("/dashboard/finanzas");
      revalidatePath("/dashboard");
    }
    return { registro };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[crearRegistro]", error);
    return { error: "Error interno" };
  }
}

export async function actualizarRegistro(
  registroId: string,
  _prev: RegistroActionState,
  formData: FormData
): Promise<RegistroActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const parsed = registroUpdateSchema.safeParse({
    tipo: formData.get("tipo") || undefined,
    descripcion: formData.get("descripcion") || undefined,
    fecha: formData.get("fecha") || undefined,
    imagenes: getImagenes(formData),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    const registro = await fetchRegistroConFinca(registroId);
    if (!registro) return { error: "Registro no encontrado" };
    await requireAccess(session, "registroCultivo", "update", { fincaId: registro.cultivo.lote.fincaId });

    const { tipo, descripcion, fecha, imagenes } = parsed.data;
    const updated = await db.registroCultivo.update({
      where: { id: registroId },
      data: {
        ...(tipo !== undefined && { tipo }),
        ...(descripcion !== undefined && { descripcion }),
        ...(fecha !== undefined && { fecha: new Date(fecha) }),
        ...(imagenes !== undefined && { imagenes }),
      },
    });

    revalidatePath("/dashboard/cultivos");
    return { registro: updated };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[actualizarRegistro]", error);
    return { error: "Error interno" };
  }
}

export interface EliminarRegistroState {
  error?: string;
  ok?: boolean;
}

export async function eliminarRegistro(registroId: string, _prev: EliminarRegistroState): Promise<EliminarRegistroState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const registro = await fetchRegistroConFinca(registroId);
    if (!registro) return { error: "Registro no encontrado" };
    await requireAccess(session, "registroCultivo", "delete", { fincaId: registro.cultivo.lote.fincaId });

    await db.registroCultivo.delete({ where: { id: registroId } });
    revalidatePath("/dashboard/cultivos");
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[eliminarRegistro]", error);
    return { error: "Error interno" };
  }
}
