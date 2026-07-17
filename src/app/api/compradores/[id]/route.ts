import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/compradores/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const comprador = await db.comprador.findFirst({
      where: { id, userId: session.user.id },
      include: {
        ingresos: {
          include: { cultivo: { include: { lote: true } } },
          orderBy: { fecha: "desc" },
        },
      },
    });

    if (!comprador) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ data: comprador });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/compradores/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const comprador = await db.comprador.update({
      where: { id, userId: session.user.id },
      data: {
        nombre: body.nombre,
        tipo: body.tipo,
        ciudad: body.ciudad,
        departamento: body.departamento,
        contacto: body.contacto,
        email: body.email,
        telefono: body.telefono,
        capacidadTon: body.capacidadTon ? Number(body.capacidadTon) : undefined,
        precioKg: body.precioKg ? Number(body.precioKg) : undefined,
        notas: body.notas,
        estado: body.estado,
      },
    });

    return NextResponse.json({ data: comprador });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/compradores/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await db.comprador.delete({ where: { id, userId: session.user.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
