import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper: verifica que el ingreso pertenece al usuario autenticado
async function findOwnedIngreso(id: string, userId: string) {
  return db.ingreso.findFirst({
    where: {
      id,
      OR: [
        { comprador: { userId } },
        { cultivo: { lote: { finca: { userId } } } },
      ],
    },
  });
}

// PUT /api/ingresos/[id]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existing = await findOwnedIngreso(id, session.user.id);
    if (!existing)
      return NextResponse.json(
        { error: "Ingreso no encontrado o no autorizado" },
        { status: 404 }
      );

    const body = await req.json();
    const {
      concepto,
      monto,
      cantidadKg,
      precioKg,
      fecha,
      compradorId,
      cultivoId,
      notas,
    } = body;

    // Verify compradorId ownership if being changed
    if (compradorId) {
      const comprador = await db.comprador.findFirst({
        where: { id: compradorId, userId: session.user.id },
      });
      if (!comprador)
        return NextResponse.json(
          { error: "Comprador no encontrado o no autorizado" },
          { status: 403 }
        );
    }

    // Verify cultivoId ownership if being changed
    if (cultivoId) {
      const cultivo = await db.cultivo.findFirst({
        where: { id: cultivoId, lote: { finca: { userId: session.user.id } } },
      });
      if (!cultivo)
        return NextResponse.json(
          { error: "Cultivo no encontrado o no autorizado" },
          { status: 403 }
        );
    }

    const montoNum = monto !== undefined ? Number(monto) : undefined;
    const cantidadKgNum =
      cantidadKg !== undefined
        ? cantidadKg === null
          ? null
          : Number(cantidadKg)
        : undefined;
    const precioKgNum =
      precioKg !== undefined
        ? precioKg === null
          ? null
          : Number(precioKg)
        : undefined;

    const ingreso = await db.ingreso.update({
      where: { id },
      data: {
        ...(concepto !== undefined && { concepto }),
        ...(montoNum !== undefined && { monto: montoNum }),
        ...(cantidadKgNum !== undefined && { cantidadKg: cantidadKgNum }),
        ...(precioKgNum !== undefined && { precioKg: precioKgNum }),
        ...(fecha !== undefined && { fecha: new Date(fecha) }),
        ...(notas !== undefined && { notas: notas ?? null }),
        ...(compradorId !== undefined && { compradorId: compradorId ?? null }),
        ...(cultivoId !== undefined && { cultivoId: cultivoId ?? null }),
      },
      include: {
        comprador: true,
        cultivo: { include: { lote: true } },
      },
    });

    return NextResponse.json({ data: ingreso });
  } catch (error) {
    console.error("[PUT /api/ingresos/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/ingresos/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existing = await findOwnedIngreso(id, session.user.id);
    if (!existing)
      return NextResponse.json(
        { error: "Ingreso no encontrado o no autorizado" },
        { status: 404 }
      );

    await db.ingreso.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/ingresos/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
