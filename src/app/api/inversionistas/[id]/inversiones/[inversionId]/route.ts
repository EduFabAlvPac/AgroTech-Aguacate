import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

async function verifyOwnership(inversionistaId: string, inversionId: string, userId: string) {
  return db.inversionCultivo.findFirst({
    where: { id: inversionId, inversionistaId, inversionista: { userId } },
  });
}

// PUT /api/inversionistas/[id]/inversiones/[inversionId] — editar estado/condiciones
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; inversionId: string }> }
) {
  try {
    const { id: inversionistaId, inversionId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const owned = await verifyOwnership(inversionistaId, inversionId, session.user.id);
    if (!owned) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.montoAportado !== undefined) data.montoAportado = Number(body.montoAportado);
    if (body.porcentajeParticipacion !== undefined) data.porcentajeParticipacion = Number(body.porcentajeParticipacion);
    if (body.condiciones !== undefined) data.condiciones = body.condiciones || null;
    if (body.estado !== undefined) data.estado = body.estado;

    const inversion = await db.inversionCultivo.update({ where: { id: inversionId }, data });
    return NextResponse.json({ data: inversion });
  } catch (error) {
    console.error("[PUT /api/inversionistas/[id]/inversiones/[inversionId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/inversionistas/[id]/inversiones/[inversionId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; inversionId: string }> }
) {
  try {
    const { id: inversionistaId, inversionId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const owned = await verifyOwnership(inversionistaId, inversionId, session.user.id);
    if (!owned) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    await db.inversionCultivo.delete({ where: { id: inversionId } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE /api/inversionistas/[id]/inversiones/[inversionId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
