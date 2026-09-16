"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Guarda la geolocalización real del navegador (Web Geolocation API, ver
 * UbicacionCampesinoClient.tsx) para que Clima y consejos (y la franja del
 * home) usen el clima de donde el campesino de verdad está, en vez del
 * default fijo de Ocaña en src/lib/weather.ts. Sin permiso o con error,
 * nunca se llama esto — el fallback a las coordenadas por defecto ya existe
 * en weather.ts, no hace falta manejar el caso de error acá.
 */
export async function guardarUbicacionCampesino(lat: number, lng: number): Promise<{ ok?: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  // Sanidad básica — coordenadas del mundo real, nunca confiar en input del
  // cliente sin validar rango.
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { error: "Ubicación inválida" };
  }

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: { ubicacionLat: lat, ubicacionLng: lng, ubicacionActualizadaEn: new Date() },
    });
    revalidatePath("/campesino/clima");
    revalidatePath("/campesino");
    return { ok: true };
  } catch (error) {
    console.error("[guardarUbicacionCampesino]", error);
    return { error: "Error interno" };
  }
}
