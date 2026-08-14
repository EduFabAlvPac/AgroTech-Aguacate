import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { membresiaOwner } from "@/lib/equipo";
import { MODULOS_DASHBOARD, obtenerPlantillaModulos, type ModuloKey } from "@/lib/modulos";
import { registrarAuditoria } from "@/lib/audit";

function modulosValidos(modulos: unknown): ModuloKey[] | null {
  if (!Array.isArray(modulos)) return null;
  const claves = new Set(MODULOS_DASHBOARD.map((m) => m.key));
  return modulos.filter((m): m is ModuloKey => typeof m === "string" && claves.has(m as ModuloKey));
}

// PUT /api/equipo/[membresiaId] — editar rol/finca/módulos, o inactivar/
// reactivar (body: { activa: boolean } sola, sin tocar lo demás).
export async function PUT(req: Request, { params }: { params: Promise<{ membresiaId: string }> }) {
  try {
    const { membresiaId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const propia = await membresiaOwner(session.user.id);
    if (!propia) return NextResponse.json({ error: "Solo el dueño de la organización puede editar colaboradores" }, { status: 403 });

    const miembro = await db.membresia.findFirst({
      where: { id: membresiaId, organizacionId: propia.organizacionId, rol: { not: "OWNER" } },
    });
    if (!miembro) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const body = await req.json();
    const { rol, fincaId, modulos, activa } = body;

    if (activa === undefined && rol === undefined && fincaId === undefined) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    if (activa !== undefined) {
      await db.membresia.update({ where: { id: membresiaId }, data: { activa: Boolean(activa) } });
    }

    // Edición de rol/finca/módulos: se manda siempre junta (rol + fincaId)
    // desde el modal de edición — evita estados intermedios ambiguos.
    if (rol !== undefined || fincaId !== undefined) {
      if (rol !== "ADMIN_FINCA" && rol !== "COLABORADOR") {
        return NextResponse.json({ error: "rol debe ser ADMIN_FINCA o COLABORADOR" }, { status: 400 });
      }
      if (!fincaId) {
        return NextResponse.json({ error: "fincaId es requerido para editar el acceso" }, { status: 400 });
      }
      const finca = await db.finca.findFirst({ where: { id: fincaId, organizacionId: propia.organizacionId } });
      if (!finca) return NextResponse.json({ error: "Finca no encontrada en tu organización" }, { status: 404 });

      const fincaRol = rol === "ADMIN_FINCA" ? "ADMIN" : "OPERARIO";
      const modulosFinal = modulosValidos(modulos) ?? (await obtenerPlantillaModulos(propia.organizacionId))[fincaRol];
      const fincasDeLaOrg = await db.finca.findMany({ where: { organizacionId: propia.organizacionId }, select: { id: true } });

      await db.$transaction([
        db.membresia.update({ where: { id: membresiaId }, data: { rol } }),
        // Este panel solo maneja una finca por colaborador a la vez (misma
        // semántica que la creación) — si antes tenía acceso a otra finca de
        // esta org, se reemplaza por la nueva selección.
        db.fincaAcceso.deleteMany({ where: { userId: miembro.userId, fincaId: { in: fincasDeLaOrg.map((f) => f.id) } } }),
        db.fincaAcceso.create({
          data: { userId: miembro.userId, fincaId, rol: fincaRol, modulos: modulosFinal, creadoPorId: session.user.id },
        }),
      ]);
    }

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "equipo.editar",
      detalle: { membresiaId, userIdAfectado: miembro.userId, cambios: { rol, fincaId, activa } },
    });

    return NextResponse.json({ data: { updated: true } });
  } catch (error) {
    console.error("[PUT /api/equipo/[membresiaId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/equipo/[membresiaId] — remover a un colaborador de la organización
export async function DELETE(_req: Request, { params }: { params: Promise<{ membresiaId: string }> }) {
  try {
    const { membresiaId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const propia = await membresiaOwner(session.user.id);
    if (!propia) return NextResponse.json({ error: "Solo el dueño de la organización puede remover colaboradores" }, { status: 403 });

    const miembro = await db.membresia.findFirst({
      where: { id: membresiaId, organizacionId: propia.organizacionId, rol: { not: "OWNER" } },
    });
    if (!miembro) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const fincasDeLaOrg = await db.finca.findMany({
      where: { organizacionId: propia.organizacionId },
      select: { id: true },
    });

    await db.$transaction([
      db.fincaAcceso.deleteMany({
        where: { userId: miembro.userId, fincaId: { in: fincasDeLaOrg.map((f) => f.id) } },
      }),
      db.membresia.delete({ where: { id: membresiaId } }),
    ]);

    await registrarAuditoria({
      actorId: session.user.id,
      actorEmail: session.user.email,
      accion: "equipo.remover",
      detalle: { membresiaId, userIdRemovido: miembro.userId },
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/equipo/[membresiaId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
