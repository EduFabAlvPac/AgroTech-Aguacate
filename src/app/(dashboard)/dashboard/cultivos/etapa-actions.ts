"use server";

/**
 * Server Action — cambio de Etapa de un cultivo (Fase 1, ADR-006). Aparte
 * de cultivo-actions.ts a propósito: es una mutación mucho más chica y
 * frecuente (un solo select en cada tarjeta de cultivo), no la del
 * formulario completo de edición.
 *
 * Qué revalida: revalidatePath("/dashboard/cultivos"), "/dashboard" (el
 * KPI "Próxima actividad"/cosecha estimada del Dashboard depende de la
 * etapa del cultivo activo — ver getDashboardKpis en lib/data/dashboard.ts).
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import type { EtapaCultivo } from "@prisma/client";

export interface CambiarEtapaState {
  error?: string;
  etapa?: EtapaCultivo;
}

export async function cambiarEtapaCultivo(
  cultivoId: string,
  _prev: CambiarEtapaState,
  nuevaEtapa: EtapaCultivo
): Promise<CambiarEtapaState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  try {
    const existente = await db.cultivo.findUnique({
      where: { id: cultivoId },
      include: { lote: { select: { fincaId: true } } },
    });
    if (!existente) return { error: "No encontrado" };
    await requireAccess(session, "cultivo", "update", { fincaId: existente.lote.fincaId });

    const cultivo = await db.cultivo.update({
      where: { id: cultivoId },
      data: { etapa: nuevaEtapa },
      select: { etapa: true },
    });

    revalidatePath("/dashboard/cultivos");
    revalidatePath("/dashboard");
    return { etapa: cultivo.etapa };
  } catch (error) {
    if (error instanceof AuthzError) return { error: error.message };
    console.error("[cambiarEtapaCultivo]", error);
    return { error: "Error al actualizar la etapa" };
  }
}
