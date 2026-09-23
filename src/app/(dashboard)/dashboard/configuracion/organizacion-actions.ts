"use server";

/**
 * Server Action — pestaña "Organización" de Configuración (ADR-011 Sprint 3).
 * Primer punto de la app que deja editar la `Organizacion` en sí (hasta
 * ahora solo se creaba una vez, en el registro, y nunca se volvía a tocar).
 *
 * Autorización: mismo patrón que Equipo (`membresiaOwner()`), no
 * `requireAccess()` — es una operación exclusiva del OWNER de su propia
 * organización, igual que agregar/editar colaboradores; `requireAccess`
 * tampoco aportaría nada acá porque el OWNER siempre bypassa esa función
 * antes de tocar la matriz (ver src/lib/authz.ts).
 *
 * `tipo`/`plan` no se aceptan acá a propósito — son de solo lectura en
 * OrganizacionTab.tsx (ver comentario en validations.ts::organizacionSchema).
 */
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { membresiaOwner } from "@/lib/equipo";
import { organizacionSchema } from "@/lib/validations";
import { registrarAuditoria } from "@/lib/audit";
import type { OrganizacionResumen } from "@/lib/data/configuracion";

export interface OrganizacionActionState {
  error?: string;
  organizacion?: OrganizacionResumen;
}

function vacioANull(v: string | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  return v.trim() === "" ? null : v.trim();
}

export async function actualizarOrganizacion(_prev: OrganizacionActionState, formData: FormData): Promise<OrganizacionActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const propia = await membresiaOwner(session.user.id);
  if (!propia) return { error: "Solo el dueño de la organización puede editar estos datos" };

  const parsed = organizacionSchema.safeParse({
    nombre: formData.get("nombre"),
    nit: formData.get("nit") || undefined,
    ciudad: formData.get("ciudad") || undefined,
    departamento: formData.get("departamento") || undefined,
    emailContacto: formData.get("emailContacto") || undefined,
    celularContacto: formData.get("celularContacto") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { nombre, nit, ciudad, departamento, emailContacto, celularContacto } = parsed.data;

  try {
    const organizacion = await db.organizacion.update({
      where: { id: propia.organizacionId },
      data: {
        nombre,
        nit: vacioANull(nit),
        ciudad: vacioANull(ciudad),
        departamento: vacioANull(departamento),
        emailContacto: vacioANull(emailContacto),
        celularContacto: vacioANull(celularContacto),
      },
      select: {
        id: true, nombre: true, tipo: true, plan: true,
        nit: true, ciudad: true, departamento: true, emailContacto: true, celularContacto: true,
      },
    });

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "organizacion.editar",
      detalle: { cambios: { nombre, nit, ciudad, departamento, emailContacto, celularContacto } },
      organizacionId: propia.organizacionId,
      recurso: "Organizacion",
      recursoId: propia.organizacionId,
    });

    revalidatePath("/dashboard/configuracion");
    return { organizacion };
  } catch (error) {
    console.error("[actualizarOrganizacion]", error);
    return { error: "Error interno" };
  }
}
