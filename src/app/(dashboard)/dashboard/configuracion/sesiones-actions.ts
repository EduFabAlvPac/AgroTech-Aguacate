"use server";

/**
 * Server Actions — lista y cierre de sesiones (ADR-011 Sprint 6, pestaña
 * "Seguridad" de Configuración). Disponible para cualquier usuario
 * autenticado sobre SUS propias sesiones: todo se acota a `session.user.id`.
 *
 * Ojo: cerrar una sesión ajena tarda hasta 5 minutos en surtir efecto en ese
 * dispositivo (SESION_REVALIDACION_STALENESS_MS, ver src/lib/sesiones.ts) — el
 * JWT del otro dispositivo solo vuelve a consultar la lista de revocación
 * pasada esa ventana. Trade-off ya documentado en el Sprint 1.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import {
  listarSesionesDeUsuario,
  revocarSesionPorId,
  revocarOtrasSesiones,
  type SesionResumen,
} from "@/lib/sesiones";

export interface MisSesionesState {
  error?: string;
  sesiones?: SesionResumen[];
}

export async function obtenerMisSesiones(): Promise<MisSesionesState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  try {
    return { sesiones: await listarSesionesDeUsuario(session.user.id, session.user.sesionHash) };
  } catch (error) {
    console.error("[obtenerMisSesiones]", error);
    return { error: "Error interno" };
  }
}

export interface CerrarSesionState {
  error?: string;
  ok?: boolean;
  cerradas?: number;
}

export async function cerrarSesionEspecifica(sesionId: string): Promise<CerrarSesionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  try {
    const sesiones = await listarSesionesDeUsuario(session.user.id, session.user.sesionHash);
    // La sesión en curso no se cierra desde acá — para eso existe "Cerrar sesión".
    if (sesiones.find((s) => s.id === sesionId)?.actual) return { error: "Esta es tu sesión actual — usa «Cerrar sesión»" };

    const cerrada = await revocarSesionPorId(sesionId, session.user.id);
    if (!cerrada) return { error: "No se encontró esa sesión" };

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "sesion.revocar",
      detalle: { sesionId },
    });
    return { ok: true };
  } catch (error) {
    console.error("[cerrarSesionEspecifica]", error);
    return { error: "Error interno" };
  }
}

export async function cerrarOtrasSesiones(): Promise<CerrarSesionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  // Sin hash de la sesión en curso (token anterior al Sprint 1, sin sid) no
  // hay forma segura de distinguirla — mejor no cerrar nada que cerrar la propia.
  if (!session.user.sesionHash) return { error: "Vuelve a iniciar sesión para usar esta opción" };
  try {
    const cerradas = await revocarOtrasSesiones(session.user.id, session.user.sesionHash);
    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "sesion.revocar_otras",
      detalle: { cerradas },
    });
    return { ok: true, cerradas };
  } catch (error) {
    console.error("[cerrarOtrasSesiones]", error);
    return { error: "Error interno" };
  }
}
