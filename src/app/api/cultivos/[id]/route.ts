import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function verifyCultivoOwnership(cultivoId: string, userId: string) {
  return db.cultivo.findFirst({
    where: { id: cultivoId, lote: { finca: { userId } } },
  });
}

// GET /api/cultivos/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const cultivo = await db.cultivo.findFirst({
      where: { id, lote: { finca: { userId: session.user.id } } },
      include: {
        lote: { include: { finca: true } },
        registros: { orderBy: { fecha: "desc" } },
        gastos: { orderBy: { fecha: "desc" } },
        ingresos: { include: { comprador: true }, orderBy: { fecha: "desc" } },
      },
    });

    if (!cultivo) return NextResponse.json({ error: "Cultivo no encontrado" }, { status: 404 });

    return NextResponse.json({ data: cultivo });
  } catch (error) {
    console.error("[GET /api/cultivos/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/cultivos/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const owned = await verifyCultivoOwnership(id, session.user.id);
    if (!owned) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const body = await req.json();
    const cultivo = await db.cultivo.update({
      where: { id },
      data: {
        especie: body.especie,
        variedad: body.variedad,
        fechaSiembra: body.fechaSiembra ? new Date(body.fechaSiembra) : undefined,
        cantidadPlantas: body.cantidadPlantas ? Number(body.cantidadPlantas) : undefined,
        densidadHa: body.densidadHa ? Number(body.densidadHa) : undefined,
        etapa: body.etapa,
        estado: body.estado,
        notas: body.notas,
      },
    });

    return NextResponse.json({ data: cultivo });
  } catch (error) {
    console.error("[PUT /api/cultivos/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/cultivos/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const owned = await verifyCultivoOwnership(id, session.user.id);
    if (!owned) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await db.cultivo.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/cultivos/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
