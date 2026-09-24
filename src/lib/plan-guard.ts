/**
 * Bloqueo de escritura de una organización en modo lectura (trial vencido o
 * plan suspendido) — capa con BD sobre la lógica pura de src/lib/plan.ts.
 * Devuelve el MENSAJE del bloqueo (o null si puede escribir) en vez de lanzar,
 * para que lo use tanto `requireAccess()` (que lanza AuthzError) como los
 * caminos que saltan `requireAccess` (Equipo, Campesino, Inversionistas: solo
 * el dueño, chequeados con `membresiaOwner`) devolviendo `{ error }`.
 *
 * Los GET nunca se bloquean. Quedan exentas las acciones PERSONALES
 * (configuración, MFA, sesiones, chat, cuenta) y las que REDUCEN acceso
 * (quitar un colaborador o un dispositivo): un dueño con la prueba vencida
 * debe poder seguir protegiendo su cuenta.
 */
import { db } from "./db";
import { membresiaOwner } from "./equipo";
import { puedeEscribir, puedeAgregarAsociado, MENSAJE_MODO_LECTURA, MENSAJE_LIMITE_ASOCIADOS } from "./plan";

export async function motivoBloqueoEscritura(organizacionId: string): Promise<string | null> {
  const org = await db.organizacion.findUnique({
    where: { id: organizacionId },
    select: { esTrial: true, trialFinEn: true, estadoPlan: true, trialMaxAsociados: true, limiteAsociadosPlan: true },
  });
  // Sin fila (no debería pasar) no se bloquea: ante la duda, no dejar sin
  // poder trabajar a alguien por un dato que falta.
  if (!org) return null;
  return puedeEscribir(org) ? null : MENSAJE_MODO_LECTURA;
}

/** Igual, para el dueño de la organización ACTIVA de `userId` — para las
 * rutas que hoy solo verifican `membresiaOwner` (Equipo, Inversionistas...). */
export async function motivoBloqueoEscrituraDeDueno(userId: string): Promise<string | null> {
  const propia = await membresiaOwner(userId);
  return propia ? motivoBloqueoEscritura(propia.organizacionId) : null;
}

/** Asociados (cuentas Campesino) de la organización: las creadas en ella, más
 * las anteriores al campo `creadoEnOrganizacionId` (null) que creó este dueño
 * — todos los dueños de entonces tenían una sola organización. */
export async function contarAsociados(organizacionId: string, ownerId: string): Promise<number> {
  return db.user.count({
    where: {
      experiencia: "CAMPESINO",
      OR: [{ creadoEnOrganizacionId: organizacionId }, { creadoEnOrganizacionId: null, creadoPorId: ownerId }],
    },
  });
}

/** Mensaje si agregar UN asociado más excedería el límite del plan/trial; null si cabe. */
export async function motivoLimiteAsociados(organizacionId: string, ownerId: string): Promise<string | null> {
  const org = await db.organizacion.findUnique({
    where: { id: organizacionId },
    select: { esTrial: true, trialFinEn: true, estadoPlan: true, trialMaxAsociados: true, limiteAsociadosPlan: true },
  });
  if (!org) return null;
  const actuales = await contarAsociados(organizacionId, ownerId);
  return puedeAgregarAsociado(org, actuales) ? null : MENSAJE_LIMITE_ASOCIADOS;
}
