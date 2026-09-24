import { membresiaOwnerActiva, membresiaOwnerSinContexto } from "@/lib/organizacion-activa";

/**
 * Devuelve la organización ACTIVA de la que `userId` es OWNER, o null (si la
 * persona no es dueña en el contexto activo — con varias organizaciones puede
 * ser dueña de una y colaboradora de otra). Compartido entre las rutas de
 * /api/equipo — un route.ts de Next.js solo puede exportar handlers HTTP y
 * config, así que este helper vive aquí y no en route.ts.
 *
 * Multi-organización: antes era un `findFirst` sin orden (arbitrario con dos
 * organizaciones); ahora respeta la cookie de organización activa (ver
 * src/lib/organizacion-activa.ts). Con una sola organización se comporta
 * exactamente igual que antes, y los ~22 sitios que lo llaman no cambian.
 */
export const membresiaOwner = membresiaOwnerActiva;

/** Igual, pero SIN cookie de contexto — solo para flujos donde no hay
 * "quien pregunta" (ej. /api/campesino/vincular, público). */
export { membresiaOwnerSinContexto };
