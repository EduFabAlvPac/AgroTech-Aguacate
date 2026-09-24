"use server";

/**
 * Alta de cuenta "modo Campesino" (experiencia separada, ver
 * src/app/(campesino)/campesino/*) — deliberadamente MÁS SIMPLE que
 * agregarMiembro() en equipo-actions.ts: por decisión de producto, el
 * Campesino usa sus 4 funciones sin Finca/Lote/Cultivo ni Membresia/
 * FincaAcceso, así que esta acción solo crea un User plano con
 * experiencia="CAMPESINO" y su celular (sin contraseña — el login de
 * este perfil es con el número desde un dispositivo vinculado con un código
 * que genera el dueño, ver generarCodigoVinculacion() abajo y el provider
 * "telefono-campesino" en src/lib/auth.ts).
 *
 * Gateada igual que agregarMiembro(): solo el OWNER de la organización
 * (mismo criterio que el resto de Equipo, ver membresiaOwner()).
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { membresiaOwner } from "@/lib/equipo";
import { registrarAuditoria } from "@/lib/audit";
import { normalizarTelefono } from "@/lib/telefono";
import { revocarSesionesDeUsuario } from "@/lib/sesiones";
import {
  generarCodigoVinculacion as nuevoCodigo,
  hashCodigoVinculacion,
  CODIGO_VIGENCIA_HORAS,
} from "@/lib/campesino-vinculacion";

export interface CampesinoActionState {
  error?: string;
  cuenta?: { id: string; nombre: string; telefono: string };
}

export async function crearCuentaCampesino(_prev: CampesinoActionState, formData: FormData): Promise<CampesinoActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const propia = await membresiaOwner(session.user.id);
  if (!propia) return { error: "Solo el dueño de la organización puede agregar cuentas Campesino" };

  const nombre = ((formData.get("nombre") as string) || "").trim();
  // Normalizado a solo dígitos al guardar — así el login (que también
  // normaliza, ver src/lib/telefono.ts) siempre encuentra la cuenta sin
  // importar si el asesor lo escribió con espacios/guiones.
  const telefono = normalizarTelefono((formData.get("telefono") as string) || "");

  if (!nombre) return { error: "El nombre es requerido" };
  if (telefono.length < 7) return { error: "Ingresa un número de celular válido" };

  try {
    const existente = await db.user.findUnique({ where: { telefono }, select: { id: true } });
    if (existente) return { error: "Ese número ya tiene una cuenta registrada" };

    // User.email es @unique y NOT NULL — campo usado en todo el resto de la
    // app (sesión, auditoría, login Google). Las cuentas Campesino no tienen
    // correo real, así que se sintetiza uno determinista y sin colisión
    // (telefono ya es único) en vez de aflojar esa columna para todos.
    const emailSintetico = `campesino-${telefono}@sinemail.germia.local`;

    const user = await db.user.create({
      data: {
        name: nombre,
        email: emailSintetico,
        telefono,
        experiencia: "CAMPESINO",
        role: "PRODUCER",
        creadoPorId: session.user.id,
        // Las cuentas nuevas nacen protegidas: el celular solo entra desde un
        // dispositivo vinculado con un código del dueño.
        requiereVinculacion: true,
      },
    });

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "campesino.crear_cuenta",
      detalle: { userIdCreado: user.id, telefono },
      organizacionId: propia.organizacionId,
      recurso: "User",
      recursoId: user.id,
    });

    revalidatePath("/dashboard/equipo");
    return { cuenta: { id: user.id, nombre: user.name ?? nombre, telefono } };
  } catch (error) {
    console.error("[crearCuentaCampesino]", error);
    return { error: "Error interno" };
  }
}

export interface EliminarCampesinoState {
  error?: string;
  ok?: boolean;
}

/** Solo puede borrar el OWNER que la creó (creadoPorId) — evita que un
 * OWNER borre cuentas Campesino de otro. */
export async function eliminarCuentaCampesino(_prev: EliminarCampesinoState, id: string): Promise<EliminarCampesinoState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const propia = await membresiaOwner(session.user.id);
  if (!propia) return { error: "Solo el dueño de la organización puede remover cuentas Campesino" };

  try {
    const cuenta = await db.user.findFirst({
      where: { id, experiencia: "CAMPESINO", creadoPorId: session.user.id },
    });
    if (!cuenta) return { error: "No encontrado" };

    await db.user.delete({ where: { id } });

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "campesino.eliminar_cuenta",
      detalle: { userIdEliminado: id },
      organizacionId: propia.organizacionId,
      recurso: "User",
      recursoId: id,
    });

    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (error) {
    console.error("[eliminarCuentaCampesino]", error);
    return { error: "Error interno" };
  }
}

export interface CodigoVinculacionState {
  error?: string;
  /** En claro, UNA sola vez — en la BD solo queda su HMAC. */
  codigo?: string;
  expiraEn?: Date;
}

/**
 * Genera el código de 6 dígitos (válido CODIGO_VIGENCIA_HORAS) con el que un
 * campesino vincula su celular. Solo el OWNER que creó la cuenta. Invalida los
 * códigos pendientes anteriores (uno vigente a la vez) y deja la cuenta con
 * requiereVinculacion = true: para una cuenta anterior a esta protección,
 * generar el primer código es lo que la protege.
 */
export async function generarCodigoVinculacion(_prev: CodigoVinculacionState, campesinoId: string): Promise<CodigoVinculacionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const propia = await membresiaOwner(session.user.id);
  if (!propia) return { error: "Solo el dueño de la organización puede generar códigos" };

  try {
    const cuenta = await db.user.findFirst({
      where: { id: campesinoId, experiencia: "CAMPESINO", creadoPorId: session.user.id },
      select: { id: true },
    });
    if (!cuenta) return { error: "No encontrado" };

    const codigo = nuevoCodigo();
    const expiraEn = new Date(Date.now() + CODIGO_VIGENCIA_HORAS * 60 * 60 * 1000);
    const ahora = new Date();

    await db.$transaction([
      db.codigoVinculacion.updateMany({
        where: { userId: cuenta.id, usadoEn: null, invalidadoEn: null },
        data: { invalidadoEn: ahora },
      }),
      db.codigoVinculacion.create({
        data: { userId: cuenta.id, codigoHash: hashCodigoVinculacion(cuenta.id, codigo), creadoPorId: session.user.id, expiraEn },
      }),
      db.user.update({ where: { id: cuenta.id }, data: { requiereVinculacion: true } }),
    ]);

    // El código NO va en el detalle de auditoría — es una credencial.
    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "campesino.generar_codigo",
      detalle: { userIdCampesino: cuenta.id },
      organizacionId: propia.organizacionId,
      recurso: "User",
      recursoId: cuenta.id,
    });

    revalidatePath("/dashboard/equipo");
    return { codigo, expiraEn };
  } catch (error) {
    console.error("[generarCodigoVinculacion]", error);
    return { error: "Error interno" };
  }
}

/** "Quitar dispositivos": revoca todos los celulares vinculados del campesino
 * Y sus sesiones abiertas (la sesión JWT sola seguiría viva hasta 30 días).
 * Para volver a entrar necesita un código nuevo. */
export async function revocarDispositivosCampesino(_prev: EliminarCampesinoState, campesinoId: string): Promise<EliminarCampesinoState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const propia = await membresiaOwner(session.user.id);
  if (!propia) return { error: "Solo el dueño de la organización puede quitar dispositivos" };

  try {
    const cuenta = await db.user.findFirst({
      where: { id: campesinoId, experiencia: "CAMPESINO", creadoPorId: session.user.id },
      select: { id: true },
    });
    if (!cuenta) return { error: "No encontrado" };

    await db.dispositivoConfianza.updateMany({
      where: { userId: cuenta.id, revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
    await revocarSesionesDeUsuario(cuenta.id);

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "campesino.revocar_dispositivos",
      detalle: { userIdCampesino: cuenta.id },
      organizacionId: propia.organizacionId,
      recurso: "User",
      recursoId: cuenta.id,
    });

    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (error) {
    console.error("[revocarDispositivosCampesino]", error);
    return { error: "Error interno" };
  }
}
