import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/inversionistas/[id]/inversiones — registrar un aporte a un cultivo
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: inversionistaId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const inversionista = await db.inversionista.findFirst({
      where: { id: inversionistaId, userId: session.user.id },
    });
    if (!inversionista) return NextResponse.json({ error: "Inversionista no encontrado" }, { status: 404 });

    const body = await req.json();
    const { cultivoId, montoAportado, porcentajeParticipacion, fechaAporte, condiciones } = body;

    if (!cultivoId || !montoAportado || porcentajeParticipacion === undefined) {
      return NextResponse.json(
        { error: "cultivoId, montoAportado y porcentajeParticipacion son requeridos" },
        { status: 400 }
      );
    }

    // Nunca confiar en un cultivoId del cliente sin verificar ownership.
    const cultivo = await db.cultivo.findFirst({
      where: { id: cultivoId, lote: { finca: { userId: session.user.id } } },
    });
    if (!cultivo) return NextResponse.json({ error: "Cultivo no encontrado" }, { status: 404 });

    const inversion = await db.inversionCultivo.create({
      data: {
        cultivoId,
        inversionistaId,
        montoAportado: Number(montoAportado),
        porcentajeParticipacion: Number(porcentajeParticipacion),
        fechaAporte: fechaAporte ? new Date(fechaAporte) : undefined,
        condiciones: condiciones || undefined,
      },
      include: {
        cultivo: { select: { especie: true, variedad: true, lote: { select: { nombre: true } } } },
        retornos: true,
      },
    });

    return NextResponse.json({ data: inversion }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/inversionistas/[id]/inversiones]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
