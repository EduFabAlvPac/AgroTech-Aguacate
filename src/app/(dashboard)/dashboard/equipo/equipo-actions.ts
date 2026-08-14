"use server";

/**
 * Server Actions — Equipo (Fase 1, ADR-006). Misma lógica exacta que ya
 * tenían /api/equipo (POST), /api/equipo/[membresiaId] (PUT/DELETE) y
 * /api/equipo/roles (PUT) — incluyendo la creación de cuenta con bcrypt
 * cuando el email no existe todavía, las transacciones Membresia+
 * FincaAcceso, y el registro de auditoría. Las rutas API se mantienen,
 * esto es una segunda entrada. Dado lo sensible del módulo (crea cuentas,
 * maneja contraseñas), se replica literal — no se reinterpreta nada.
 *
 * Qué revalida: revalidatePath("/dashboard/equipo") en las cuatro.
 */
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { membresiaOwner } from "@/lib/equipo";
import { MODULOS_DASHBOARD, obtenerPlantillaModulos, type ModuloKey, type PlantillasModulos } from "@/lib/modulos";
import { registrarAuditoria } from "@/lib/audit";

function modulosValidos(modulos: unknown): ModuloKey[] | null {
  if (!Array.isArray(modulos)) return null;
  const claves = new Set(MODULOS_DASHBOARD.map((m) => m.key));
  return modulos.filter((m): m is ModuloKey => typeof m === "string" && claves.has(m as ModuloKey));
}

export interface MiembroActionState {
  error?: string;
  miembro?: { id: string; nombre: string | null; email: string; rol: string };
}

export async function agregarMiembro(_prev: MiembroActionState, formData: FormData): Promise<MiembroActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const propia = await membresiaOwner(session.user.id);
  if (!propia) return { error: "Solo el dueño de la organización puede agregar colaboradores" };

  const nombre = (formData.get("nombre") as string) || undefined;
  const email = (formData.get("email") as string) || undefined;
  const password = (formData.get("password") as string) || undefined;
  const rolFinca = formData.get("rolFinca") as string;
  const fincaId = formData.get("fincaId") as string;
  const modulos = JSON.parse((formData.get("modulos") as string) || "[]");

  if (!email || !rolFinca || !fincaId) {
    return { error: "email, rolFinca y fincaId son requeridos" };
  }
  if (rolFinca !== "ADMIN" && rolFinca !== "OPERARIO" && rolFinca !== "LECTURA") {
    return { error: "rolFinca debe ser ADMIN, OPERARIO o LECTURA" };
  }
  const rol = rolFinca === "ADMIN" ? "ADMIN_FINCA" : "COLABORADOR";

  try {
    const finca = await db.finca.findFirst({ where: { id: fincaId, organizacionId: propia.organizacionId } });
    if (!finca) return { error: "Finca no encontrada en tu organización" };

    let user = await db.user.findUnique({ where: { email } });

    if (user) {
      const yaEsMiembro = await db.membresia.findUnique({
        where: { userId_organizacionId: { userId: user.id, organizacionId: propia.organizacionId } },
      });
      if (yaEsMiembro) return { error: "Este correo ya es miembro de tu organización" };
    } else {
      if (!nombre || !password) {
        return { error: "nombre y contraseña son requeridos para crear la cuenta del colaborador" };
      }
      if (password.length < 8) {
        return { error: "La contraseña debe tener al menos 8 caracteres" };
      }
      const hashed = await bcrypt.hash(password, 12);
      user = await db.user.create({ data: { name: nombre, email, password: hashed, role: "ADVISOR" } });
    }

    const modulosFinal = modulosValidos(modulos) ?? (await obtenerPlantillaModulos(propia.organizacionId))[rolFinca as "ADMIN" | "OPERARIO" | "LECTURA"];

    const [membresia] = await db.$transaction([
      db.membresia.create({
        data: { userId: user.id, organizacionId: propia.organizacionId, rol, invitadoPorId: session.user.id },
      }),
      db.fincaAcceso.upsert({
        where: { userId_fincaId: { userId: user.id, fincaId } },
        update: { rol: rolFinca, modulos: modulosFinal },
        create: { userId: user.id, fincaId, rol: rolFinca, modulos: modulosFinal, creadoPorId: session.user.id },
      }),
    ]);

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "equipo.invitar",
      detalle: { membresiaId: membresia.id, emailInvitado: user.email, rol: membresia.rol, fincaId },
    });

    revalidatePath("/dashboard/equipo");
    return { miembro: { id: membresia.id, nombre: user.name, email: user.email, rol: membresia.rol } };
  } catch (error) {
    console.error("[agregarMiembro]", error);
    return { error: "Error interno" };
  }
}

export interface EditarMiembroState {
  error?: string;
  ok?: boolean;
}

/** Editar rol/finca/módulos — se manda siempre junta (rolFinca + fincaId),
 * mismo criterio que PUT /api/equipo/[membresiaId]. */
export async function editarMiembro(
  membresiaId: string,
  _prev: EditarMiembroState,
  formData: FormData
): Promise<EditarMiembroState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const propia = await membresiaOwner(session.user.id);
  if (!propia) return { error: "Solo el dueño de la organización puede editar colaboradores" };

  const rolFinca = formData.get("rolFinca") as string;
  const fincaId = formData.get("fincaId") as string;
  const modulos = JSON.parse((formData.get("modulos") as string) || "[]");

  if (rolFinca !== "ADMIN" && rolFinca !== "OPERARIO" && rolFinca !== "LECTURA") {
    return { error: "rolFinca debe ser ADMIN, OPERARIO o LECTURA" };
  }
  if (!fincaId) return { error: "fincaId es requerido para editar el acceso" };

  try {
    const miembro = await db.membresia.findFirst({
      where: { id: membresiaId, organizacionId: propia.organizacionId, rol: { not: "OWNER" } },
    });
    if (!miembro) return { error: "No encontrado" };

    const finca = await db.finca.findFirst({ where: { id: fincaId, organizacionId: propia.organizacionId } });
    if (!finca) return { error: "Finca no encontrada en tu organización" };

    const rol = rolFinca === "ADMIN" ? "ADMIN_FINCA" : "COLABORADOR";
    const modulosFinal = modulosValidos(modulos) ?? (await obtenerPlantillaModulos(propia.organizacionId))[rolFinca as "ADMIN" | "OPERARIO" | "LECTURA"];
    const fincasDeLaOrg = await db.finca.findMany({ where: { organizacionId: propia.organizacionId }, select: { id: true } });

    await db.$transaction([
      db.membresia.update({ where: { id: membresiaId }, data: { rol } }),
      db.fincaAcceso.deleteMany({ where: { userId: miembro.userId, fincaId: { in: fincasDeLaOrg.map((f) => f.id) } } }),
      db.fincaAcceso.create({
        data: { userId: miembro.userId, fincaId, rol: rolFinca, modulos: modulosFinal, creadoPorId: session.user.id },
      }),
    ]);

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "equipo.editar",
      detalle: { membresiaId, userIdAfectado: miembro.userId, cambios: { rolFinca, fincaId } },
    });

    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (error) {
    console.error("[editarMiembro]", error);
    return { error: "Error interno" };
  }
}

/** Inactivar/reactivar — no toca rol/finca/módulos, mismo PUT parcial
 * (body: { activa } sola) que ya tenía la ruta API. */
export async function toggleActivaMiembro(membresiaId: string, nuevaActiva: boolean): Promise<EditarMiembroState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const propia = await membresiaOwner(session.user.id);
  if (!propia) return { error: "Solo el dueño de la organización puede editar colaboradores" };

  try {
    const miembro = await db.membresia.findFirst({
      where: { id: membresiaId, organizacionId: propia.organizacionId, rol: { not: "OWNER" } },
    });
    if (!miembro) return { error: "No encontrado" };

    await db.membresia.update({ where: { id: membresiaId }, data: { activa: nuevaActiva } });

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "equipo.editar",
      detalle: { membresiaId, userIdAfectado: miembro.userId, cambios: { activa: nuevaActiva } },
    });

    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (error) {
    console.error("[toggleActivaMiembro]", error);
    return { error: "Error interno" };
  }
}

export interface EliminarMiembroState {
  error?: string;
  ok?: boolean;
}

export async function eliminarMiembro(_prev: EliminarMiembroState, membresiaId: string): Promise<EliminarMiembroState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const propia = await membresiaOwner(session.user.id);
  if (!propia) return { error: "Solo el dueño de la organización puede remover colaboradores" };

  try {
    const miembro = await db.membresia.findFirst({
      where: { id: membresiaId, organizacionId: propia.organizacionId, rol: { not: "OWNER" } },
    });
    if (!miembro) return { error: "No encontrado" };

    const fincasDeLaOrg = await db.finca.findMany({ where: { organizacionId: propia.organizacionId }, select: { id: true } });

    await db.$transaction([
      db.fincaAcceso.deleteMany({ where: { userId: miembro.userId, fincaId: { in: fincasDeLaOrg.map((f) => f.id) } } }),
      db.membresia.delete({ where: { id: membresiaId } }),
    ]);

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "equipo.remover",
      detalle: { membresiaId, userIdRemovido: miembro.userId },
    });

    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (error) {
    console.error("[eliminarMiembro]", error);
    return { error: "Error interno" };
  }
}

export interface GuardarPlantillaState {
  error?: string;
  ok?: boolean;
}

export async function guardarPlantillaRol(rol: "ADMIN" | "OPERARIO" | "LECTURA", modulos: PlantillasModulos["ADMIN"]): Promise<GuardarPlantillaState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  const propia = await membresiaOwner(session.user.id);
  if (!propia) return { error: "Solo el dueño de la organización puede editar esto" };

  const modulosFinal = modulosValidos(modulos);
  if (!modulosFinal) return { error: "modulos inválido" };

  try {
    await db.rolModulosDefault.upsert({
      where: { organizacionId_rol: { organizacionId: propia.organizacionId, rol } },
      create: { organizacionId: propia.organizacionId, rol, modulos: modulosFinal },
      update: { modulos: modulosFinal },
    });

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "equipo.editar_plantilla_rol",
      detalle: { rol, modulos: modulosFinal },
    });

    revalidatePath("/dashboard/equipo");
    return { ok: true };
  } catch (error) {
    console.error("[guardarPlantillaRol]", error);
    return { error: "Error interno" };
  }
}
