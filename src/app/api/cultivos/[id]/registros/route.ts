import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/cultivos/[id]/registros
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const registros = await db.registroCultivo.findMany({
      where: {
        cultivoId: id,
        cultivo: { lote: { finca: { userId: session.user.id } } },
      },
      orderBy: { fecha: "desc" },
    });

    return NextResponse.json({ data: registros });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/cultivos/[id]/registros
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { tipo, descripcion, fecha } = body;

    if (!tipo || !descripcion) {
      return NextResponse.json({ error: "tipo y descripcion son requeridos" }, { status: 400 });
    }

    const registro = await db.registroCultivo.create({
      data: {
        cultivoId: id,
        tipo,
        descripcion,
        fecha: fecha ? new Date(fecha) : new Date(),
        imagenes: body.imagenes ?? [],
        datos: body.datos,
      },
    });

    return NextResponse.json({ data: registro }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/cultivos/[id]/registros]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
