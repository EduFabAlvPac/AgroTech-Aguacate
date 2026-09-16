"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Configuración mínima del modo Campesino — solo el nombre. Sin cambio de
 * celular (es el identificador de login, editarlo autoservicio abre una
 * superficie de account-takeover innecesaria para el MVP — que lo cambie un
 * asesor si hace falta) ni de contraseña (estas cuentas no tienen).
 */
export async function actualizarNombreCampesino(nombre: string): Promise<{ error?: string; ok?: boolean }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const limpio = nombre.trim();
  if (!limpio) return { error: "El nombre no puede estar vacío" };

  try {
    await db.user.update({ where: { id: session.user.id }, data: { name: limpio } });
    revalidatePath("/campesino/perfil");
    revalidatePath("/campesino/perfil/configuracion");
    return { ok: true };
  } catch (error) {
    console.error("[actualizarNombreCampesino]", error);
    return { error: "Error interno" };
  }
}
