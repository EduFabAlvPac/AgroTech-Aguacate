"use server";

/**
 * Server Action — invitar por correo (ADR-011 Sprint 3). Alternativa nueva
 * a `agregarMiembro()` (equipo-actions.ts): en vez de que el dueño escriba
 * una contraseña temporal y la comparta por fuera de la app (WhatsApp/
 * verbal), se manda un enlace real y la persona invitada crea su propia
 * cuenta (o acepta con la que ya tenga). Ambos caminos conviven — este no
 * reemplaza a `agregarMiembro()`, que se conserva para quien prefiera crear
 * la cuenta directamente.
 *
 * Usa el modelo `Invitacion` (schema desde el PR #50, sin usar hasta ahora)
 * — mismo patrón de token con hash que `TokenAuth` (ADR-011 Sprint 1):
 * `tokenHash` es lo único que se guarda, el token crudo solo viaja por el
 * correo.
 */
import { motivoBloqueoEscritura } from "@/lib/plan-guard";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { membresiaOwner } from "@/lib/equipo";
import { invitarMiembroSchema } from "@/lib/validations";
import { generarToken, expiraEnHoras, hashToken } from "@/lib/tokens";
import { enviarEmailInvitacion } from "@/lib/email";
import { verificarLimite, RateLimitError } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/audit";
import type { Rol } from "@prisma/client";

export interface InvitarMiembroState {
  error?: string;
  ok?: boolean;
}

const ROL_LABEL: Record<"ADMIN" | "OPERARIO", string> = {
  ADMIN: "administrador de finca",
  OPERARIO: "colaborador",
};

// Mismo mapeo que agregarMiembro() (equipo-actions.ts) a nivel de rol de
// organización. `rolFinca` (ADMIN/OPERARIO) se reconstruye 1:1 al aceptar
// porque acá solo hay 2 opciones (ver invitarMiembroSchema) — a diferencia
// de agregarMiembro(), que también ofrece LECTURA.
function rolIamDeRolFinca(rolFinca: "ADMIN" | "OPERARIO"): Rol {
  return rolFinca === "ADMIN" ? "FARM_ADMIN" : "FARM_COLLABORATOR";
}

export async function invitarMiembroPorCorreo(_prev: InvitarMiembroState, formData: FormData): Promise<InvitarMiembroState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const propia = await membresiaOwner(session.user.id);
  if (!propia) return { error: "Solo el dueño de la organización puede invitar colaboradores" };
  // Modo lectura (trial vencido): no se agregan/editan cosas de la organización.
  const bloqueo = await motivoBloqueoEscritura(propia.organizacionId);
  if (bloqueo) return { error: bloqueo };

  const parsed = invitarMiembroSchema.safeParse({
    email: formData.get("email"),
    rolFinca: formData.get("rolFinca"),
    fincaId: formData.get("fincaId"),
    mensajePersonal: formData.get("mensajePersonal") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { email, rolFinca, fincaId, mensajePersonal } = parsed.data;

  try {
    await verificarLimite("invitarMiembro", propia.organizacionId);

    const finca = await db.finca.findFirst({ where: { id: fincaId, organizacionId: propia.organizacionId } });
    if (!finca) return { error: "Finca no encontrada en tu organización" };

    const usuarioExistente = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (usuarioExistente) {
      const yaEsMiembro = await db.membresia.findFirst({
        where: { userId: usuarioExistente.id, organizacionId: propia.organizacionId },
      });
      if (yaEsMiembro) return { error: "Este correo ya es miembro de tu organización" };
    }

    // No apilar invitaciones — una pendiente (sin aceptar, sin vencer) por
    // correo+organización alcanza; reenviar la misma invitación dos veces
    // solo confundiría sobre cuál enlace es el válido.
    const invitacionPendiente = await db.invitacion.findFirst({
      where: { organizacionId: propia.organizacionId, emailOCelular: email, aceptadaEn: null, expiraEn: { gt: new Date() } },
      select: { id: true },
    });
    if (invitacionPendiente) return { error: "Ya hay una invitación pendiente para este correo" };

    const token = generarToken();
    const rolIam = rolIamDeRolFinca(rolFinca);

    const invitacion = await db.invitacion.create({
      data: {
        organizacionId: propia.organizacionId,
        emailOCelular: email,
        canalEnvio: "EMAIL",
        rol: rolIam,
        fincaId,
        tokenHash: hashToken(token),
        expiraEn: expiraEnHoras(72),
        invitadaPorId: session.user.id,
        mensajePersonal: mensajePersonal || undefined,
      },
    });

    const organizacion = await db.organizacion.findUnique({ where: { id: propia.organizacionId }, select: { nombre: true } });
    await enviarEmailInvitacion(email, organizacion?.nombre ?? "Tu equipo en GermIA", ROL_LABEL[rolFinca], token, mensajePersonal || undefined);

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "equipo.invitacion_enviada",
      detalle: { invitacionId: invitacion.id, emailInvitado: email, rol: rolIam, fincaId },
      organizacionId: propia.organizacionId,
      recurso: "Invitacion",
      recursoId: invitacion.id,
    });

    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (error) {
    if (error instanceof RateLimitError) return { error: error.message };
    console.error("[invitarMiembroPorCorreo]", error);
    return { error: "Error interno" };
  }
}
