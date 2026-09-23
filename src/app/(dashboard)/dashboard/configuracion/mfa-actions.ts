"use server";

/**
 * Server Actions — pestaña "Seguridad" de Configuración (ADR-011 Sprint 6).
 * Alta/baja de MFA (TOTP) y regeneración de códigos de respaldo. Disponible
 * para cualquier usuario autenticado (no gateado a OWNER, a diferencia de
 * "Organización") — es una preferencia de la CUENTA de la persona, igual
 * que el cambio de contraseña en "Perfil".
 *
 * Autorización re-forzada con contraseña en desactivar/regenerar (mismo
 * criterio que eliminarCuenta() en config-actions.ts) — son las dos
 * operaciones que reducen la protección de la cuenta, así que no basta con
 * tener la sesión abierta.
 */
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { registrarAuditoria } from "@/lib/audit";
import {
  encriptarSecreto,
  desencriptarSecreto,
  generarSecretoTOTP,
  generarUriQR,
  verificarCodigoTOTP,
  generarCodigosRespaldo,
  hashCodigoRespaldo,
} from "@/lib/mfa";

export interface IniciarActivacionMfaState {
  error?: string;
  secreto?: string;
  uriQR?: string;
}

/** Paso 1: genera un secreto nuevo y lo guarda cifrado — `mfaHabilitado`
 * sigue en `false` hasta que confirmarActivacionMfa() verifique un primer
 * código real (evita que una activación a medias, sin que el usuario haya
 * escaneado nada, deje la cuenta con MFA "activado" pero sin forma de
 * generar el código). Reintentar este paso (ej. el usuario recarga la
 * página) simplemente reemplaza el secreto anterior — no hay nada que
 * perder porque todavía no está en uso. */
export async function iniciarActivacionMfa(): Promise<IniciarActivacionMfaState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) return { error: "No autorizado" };

  try {
    const secreto = generarSecretoTOTP();
    await db.user.update({
      where: { id: session.user.id },
      data: { mfaSecret: encriptarSecreto(secreto) },
    });
    return { secreto, uriQR: generarUriQR(secreto, session.user.email) };
  } catch (error) {
    console.error("[iniciarActivacionMfa]", error);
    return { error: error instanceof Error && error.message.includes("MFA_ENCRYPTION_KEY") ? error.message : "Error interno" };
  }
}

export interface ConfirmarActivacionMfaState {
  error?: string;
  codigosRespaldo?: string[];
}

/** Paso 2: verifica el primer código real contra el secreto guardado en el
 * paso 1. Si coincide, activa MFA y genera los 10 códigos de respaldo —
 * devueltos EN CLARO una sola vez en esta respuesta; de ahí en adelante solo
 * se guardan sus hashes (mismo criterio que una contraseña: nunca se vuelve
 * a poder leer, solo regenerar). */
export async function confirmarActivacionMfa(codigo: string): Promise<ConfirmarActivacionMfaState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  if (!codigo?.trim()) return { error: "Ingresa el código de 6 dígitos" };

  try {
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { mfaSecret: true, mfaHabilitado: true } });
    if (!user?.mfaSecret) return { error: "Primero genera el código QR" };
    if (user.mfaHabilitado) return { error: "La verificación en dos pasos ya está activa" };

    const secreto = desencriptarSecreto(user.mfaSecret);
    const valido = await verificarCodigoTOTP(secreto, codigo);
    if (!valido) return { error: "Código incorrecto — revisa la hora de tu celular e intenta de nuevo" };

    const codigosRespaldo = generarCodigosRespaldo();
    await db.user.update({
      where: { id: session.user.id },
      data: { mfaHabilitado: true, mfaBackupCodes: codigosRespaldo.map(hashCodigoRespaldo) },
    });

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "mfa.activar",
    });

    revalidatePath("/dashboard/configuracion");
    return { codigosRespaldo };
  } catch (error) {
    console.error("[confirmarActivacionMfa]", error);
    return { error: "Error interno" };
  }
}

export interface MfaActionState {
  error?: string;
  ok?: boolean;
}

export async function desactivarMfa(password: string): Promise<MfaActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  if (!password) return { error: "Ingresa tu contraseña para confirmar" };

  try {
    const user = await db.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
    const valida = user?.password ? await bcrypt.compare(password, user.password) : false;
    if (!valida) return { error: "Contraseña incorrecta" };

    await db.user.update({
      where: { id: session.user.id },
      data: { mfaHabilitado: false, mfaSecret: null, mfaBackupCodes: [] },
    });

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "mfa.desactivar",
    });

    revalidatePath("/dashboard/configuracion");
    return { ok: true };
  } catch (error) {
    console.error("[desactivarMfa]", error);
    return { error: "Error interno" };
  }
}

export interface RegenerarCodigosState {
  error?: string;
  codigosRespaldo?: string[];
}

export async function regenerarCodigosRespaldo(password: string): Promise<RegenerarCodigosState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };
  if (!password) return { error: "Ingresa tu contraseña para confirmar" };

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, mfaHabilitado: true },
    });
    if (!user?.mfaHabilitado) return { error: "La verificación en dos pasos no está activa" };
    const valida = user.password ? await bcrypt.compare(password, user.password) : false;
    if (!valida) return { error: "Contraseña incorrecta" };

    const codigosRespaldo = generarCodigosRespaldo();
    await db.user.update({
      where: { id: session.user.id },
      data: { mfaBackupCodes: codigosRespaldo.map(hashCodigoRespaldo) },
    });

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "mfa.regenerar_codigos",
    });

    return { codigosRespaldo };
  } catch (error) {
    console.error("[regenerarCodigosRespaldo]", error);
    return { error: "Error interno" };
  }
}
