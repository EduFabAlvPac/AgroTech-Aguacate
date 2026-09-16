"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { esEspecieCampesinoValida } from "@/lib/campesino-especies";

export interface ToggleCultivoState {
  error?: string;
  seleccionados?: string[];
}

/** Guarda con un solo toque — sin formulario, sin botón "Guardar" aparte
 * (decisión de producto: cero fricción para elegir qué cultivos maneja). */
export async function toggleCultivoSeleccionado(slug: string): Promise<ToggleCultivoState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  if (!esEspecieCampesinoValida(slug)) return { error: "Cultivo no reconocido" };

  try {
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { cultivosSeleccionados: true } });
    const actuales = user?.cultivosSeleccionados ?? [];
    const seleccionados = actuales.includes(slug) ? actuales.filter((s) => s !== slug) : [...actuales, slug];

    await db.user.update({ where: { id: session.user.id }, data: { cultivosSeleccionados: seleccionados } });

    revalidatePath("/campesino/cultivos");
    return { seleccionados };
  } catch (error) {
    console.error("[toggleCultivoSeleccionado]", error);
    return { error: "Error interno" };
  }
}
