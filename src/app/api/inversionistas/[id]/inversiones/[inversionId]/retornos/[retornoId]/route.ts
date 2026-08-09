import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE /api/inversionistas/[id]/inversiones/[inversionId]/retornos/[retornoId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; inversionId: string; retornoId: string }> }
) {
  try {
    const { id: inversionistaId, inversionId, retornoId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const retorno = await db.retornoInversion.findFirst({
      where: {
        id: retornoId,
        inversionId,
        inversion: { inversionistaId, inversionista: { userId: session.user.id } },
      },
    });
    if (!retorno) return NextResponse.json({ error: "Retorno no encontrado" }, { status: 404 });

    await db.retornoInversion.delete({ where: { id: retornoId } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    console.error("[DELETE .../retornos/[retornoId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
