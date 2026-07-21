import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT /api/gastos/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const gasto = await db.gasto.update({
      where: { id },
      data: {
        concepto: body.concepto,
        categoria: body.categoria,
        monto: body.monto ? Number(body.monto) : undefined,
        fecha: body.fecha ? new Date(body.fecha) : undefined,
        proveedor: body.proveedor || null,
        notas: body.notas || null,
        cultivoId: body.cultivoId || null,
        loteId: body.loteId || null,
        subcategoria: body.subcategoria || null,
        cantidad: body.cantidad ? Number(body.cantidad) : null,
        unidad: body.unidad || null,
        precioUnitario: body.precioUnitario ? Number(body.precioUnitario) : null,
        numeroFactura: body.numeroFactura || null,
        tipoGasto: body.tipoGasto || undefined,
      },
      include: { cultivo: { include: { lote: true } }, lote: true },
    });

    return NextResponse.json({ data: gasto });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/gastos/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    await db.gasto.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
