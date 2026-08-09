import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";
import { assertFichaEditable, FichaNoEditableError } from "@/lib/fichas-tecnicas";

// DELETE /api/admin/fichas-tecnicas/[id]/curva/[puntoId]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; puntoId: string }> }) {
  try {
    const { id: fichaId, puntoId } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const punto = await db.puntoCurvaProduccion.findUnique({ where: { id: puntoId }, select: { fichaId: true } });
    if (!punto || punto.fichaId !== fichaId) {
      return NextResponse.json({ error: "Punto de curva no encontrado" }, { status: 404 });
    }

    await db.puntoCurvaProduccion.delete({ where: { id: puntoId } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof FichaNoEditableError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/admin/fichas-tecnicas/[id]/curva/[puntoId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
