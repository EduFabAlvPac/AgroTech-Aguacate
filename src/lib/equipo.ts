import { db } from "@/lib/db";

/**
 * Devuelve la organización de la que `userId` es OWNER, o null. Compartido
 * entre las rutas de /api/equipo — un route.ts de Next.js solo puede exportar
 * handlers HTTP y config, así que este helper vive aquí y no en route.ts.
 */
export async function membresiaOwner(userId: string) {
  return db.membresia.findFirst({
    where: { userId, rol: "OWNER", aceptada: true, activa: true },
    select: { organizacionId: true },
  });
}
