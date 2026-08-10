import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/equipo/[membresiaId] — remover a un colaborador de la organización
export async function DELETE(_req: Request, { params }: { params: Promise<{ membresiaId: string }> }) {
  try {
    const { membresiaId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const propia = await db.membresia.findFirst({
      where: { userId: session.user.id, rol: "OWNER", aceptada: true },
      select: { organizacionId: true },
    });
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

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/equipo/[membresiaId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
