"use server";

/**
 * Server Action — Jornal (Fase 1, ADR-006). RegistroJornalForm permite
 * registrar VARIOS días de trabajo en un solo envío (antes: un fetch
 * POST /api/jornales por cada día, en un loop secuencial en el cliente) —
 * aquí se colapsa en una sola Server Action que crea todos los jornales (y
 * su gasto MANO_OBRA asociado, mismo efecto colateral que la ruta API) en
 * el servidor.
 *
 * Qué revalida: revalidatePath("/dashboard/finanzas"), "/dashboard" — cada
 * jornal crea un Gasto real (categoría MANO_OBRA), así que aplica el mismo
 * criterio que gasto-actions.ts.
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { resolverFincaActiva } from "@/lib/finca-activa";
import type { Jornal } from "@prisma/client";

export interface JornalActionState {
  error?: string;
  jornales?: Jornal[];
}

interface EntradaJornal {
  fecha: string;
}

function getEntradas(formData: FormData): EntradaJornal[] {
  const raw = formData.get("entradas");
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.fecha === "string") : [];
  } catch {
    return [];
  }
}

function str(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export async function crearJornales(_prev: JornalActionState, formData: FormData): Promise<JornalActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const operario = str(formData, "operario");
  const valorDia = Number(str(formData, "valorDia") ?? "0");
  const actividad = str(formData, "actividad");
  const descripcion = str(formData, "descripcion");
  const cultivoId = str(formData, "cultivoId");
  const loteId = str(formData, "loteId");
  const imagen = str(formData, "imagen");
  const entradas = getEntradas(formData);

  if (!operario) return { error: "El nombre del operario es requerido" };
  if (!valorDia || valorDia <= 0) return { error: "El valor del día debe ser mayor a 0" };
  if (!actividad) return { error: "La actividad es requerida" };
  if (entradas.length === 0) return { error: "Agrega al menos un día de trabajo" };

  try {
    // Resolver la finca — idéntico a /api/jornales POST.
    let fincaId: string | undefined;
    if (loteId) {
      const lote = await db.lote.findUnique({ where: { id: loteId }, select: { fincaId: true } });
      if (!lote) return { error: "Lote no encontrado" };
      fincaId = lote.fincaId;
    } else if (cultivoId) {
      const cultivo = await db.cultivo.findUnique({ where: { id: cultivoId }, select: { lote: { select: { fincaId: true } } } });
      if (!cultivo) return { error: "Cultivo no encontrado" };
      fincaId = cultivo.lote.fincaId;
    } else {
      const { fincaActivaId } = await resolverFincaActiva(session);
      if (!fincaActivaId) return { error: "No se encontró finca" };
      fincaId = fincaActivaId;
    }

    await requireAccess(session, "jornal", "create", { fincaId });

    const jornales: Jornal[] = [];
    for (const entrada of entradas) {
      const fecha = new Date(entrada.fecha);
      const jornal = await db.jornal.create({
        data: {
          operario,
          fecha,
          horasTrabajadas: 8,
          valorDia,
          actividad,
          descripcion: descripcion ?? null,
          imagen: imagen ?? null,
          cultivoId: cultivoId || null,
          loteId: loteId || null,
        },
        include: { lote: { select: { nombre: true } }, cultivo: { select: { especie: true, variedad: true } } },
      });

      // ── Efecto colateral: crear gasto automático MANO_OBRA (idéntico a la ruta API) ──
      await db.gasto.create({
        data: {
          userId: session.user.id,
          fincaId,
          concepto: `Jornal ${operario} — ${actividad}`,
          categoria: "MANO_OBRA",
          monto: valorDia,
          fecha,
          notas: "Registrado automáticamente desde módulo de Jornales. 8h trabajadas.",
          cultivoId: cultivoId || null,
          loteId: loteId || null,
        },
      });

      jornales.push(jornal);
    }

    revalidatePath("/dashboard/finanzas");
    revalidatePath("/dashboard");
    return { jornales };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[crearJornales]", error);
    return { error: "Error al registrar jornales" };
  }
}
