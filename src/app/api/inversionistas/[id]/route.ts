import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/inversionistas/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const inversionista = await db.inversionista.update({
      where: { id, userId: session.user.id },
      data: {
        nombre: body.nombre,
        email: body.email || null,
        telefono: body.telefono || null,
        notas: body.notas || null,
      },
    });

    return NextResponse.json({ data: inversionista });
  } catch (error) {
    console.error("[PUT /api/inversionistas/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/inversionistas/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await db.inversionista.delete({ where: { id, userId: session.user.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/inversionistas/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
