import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/alertas/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const alerta = await db.alertaClimatica.findUnique({ where: { id } });
    if (!alerta) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    return NextResponse.json({ data: alerta });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/alertas/[id] — mark as read, toggle active, update
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const alerta = await db.alertaClimatica.update({
      where: { id },
      data: {
        leida: body.leida !== undefined ? body.leida : undefined,
        activa: body.activa !== undefined ? body.activa : undefined,
        titulo: body.titulo,
        descripcion: body.descripcion,
      },
    });

    return NextResponse.json({ data: alerta });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/alertas/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await db.alertaClimatica.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
