"use server";

/**
 * Alta de cuenta "modo Campesino" (experiencia separada, ver
 * src/app/(campesino)/campesino/*) — deliberadamente MÁS SIMPLE que
 * agregarMiembro() en equipo-actions.ts: por decisión de producto, el
 * Campesino usa sus 4 funciones sin Finca/Lote/Cultivo ni Membresia/
 * FincaAcceso, así que esta acción solo crea un User plano con
 * experiencia="CAMPESINO" y su celular (sin contraseña — el login de
 * este perfil es solo con el número, ver provider "telefono-campesino"
 * en src/lib/auth.ts).
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
