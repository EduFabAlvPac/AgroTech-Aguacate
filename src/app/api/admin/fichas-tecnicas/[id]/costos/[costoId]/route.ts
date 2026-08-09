import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";
import { assertFichaEditable, FichaNoEditableError } from "@/lib/fichas-tecnicas";

// DELETE /api/admin/fichas-tecnicas/[id]/costos/[costoId]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; costoId: string }> }) {
  try {
    const { id: fichaId, costoId } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const costo = await db.costoReferencia.findUnique({ where: { id: costoId }, select: { fichaId: true } });
    if (!costo || costo.fichaId !== fichaId) {
      return NextResponse.json({ error: "Costo de referencia no encontrado" }, { status: 404 });
    }

    await db.costoReferencia.delete({ where: { id: costoId } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof FichaNoEditableError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/admin/fichas-tecnicas/[id]/costos/[costoId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
