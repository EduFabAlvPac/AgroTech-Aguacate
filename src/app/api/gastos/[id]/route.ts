import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";

// PUT /api/gastos/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Antes esta ruta no verificaba en absoluto que el gasto perteneciera al
    // usuario/organización — cualquier autenticado podía editar cualquier
    // gasto por id (IDOR). Se corrige junto con la migración a RBAC (Fase 2).
    const existente = await db.gasto.findUnique({ where: { id }, select: { fincaId: true } });
    if (!existente) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    await requireAccess(session, "gasto", "update", { fincaId: existente.fincaId });

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
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[PUT /api/gastos/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/gastos/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await db.gasto.findUnique({ where: { id }, select: { fincaId: true } });
    if (!existente) return NextResponse.json({ error: "Gasto no encontrado" }, { status: 404 });
    await requireAccess(session, "gasto", "delete", { fincaId: existente.fincaId });

    await db.gasto.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/gastos/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
