import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/inversionistas/[id]/inversiones/[inversionId]/retornos
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; inversionId: string }> }
) {
  try {
    const { id: inversionistaId, inversionId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const inversion = await db.inversionCultivo.findFirst({
      where: { id: inversionId, inversionistaId, inversionista: { userId: session.user.id } },
    });
    if (!inversion) return NextResponse.json({ error: "Inversión no encontrada" }, { status: 404 });

    const body = await req.json();
    const { monto, fecha, concepto } = body;
    if (!monto) return NextResponse.json({ error: "monto es requerido" }, { status: 400 });

    const retorno = await db.retornoInversion.create({
      data: {
        inversionId,
        monto: Number(monto),
        fecha: fecha ? new Date(fecha) : undefined,
        concepto: concepto || undefined,
      },
    });

    return NextResponse.json({ data: retorno }, { status: 201 });
  } catch (error) {
    console.error("[POST .../retornos]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
