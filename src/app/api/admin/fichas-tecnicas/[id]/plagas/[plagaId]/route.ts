import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";
import { assertFichaEditable, FichaNoEditableError } from "@/lib/fichas-tecnicas";

// DELETE /api/admin/fichas-tecnicas/[id]/plagas/[plagaId]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; plagaId: string }> }) {
  try {
    const { id: fichaId, plagaId } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const plaga = await db.plagaEnfermedad.findUnique({ where: { id: plagaId }, select: { fichaId: true } });
    if (!plaga || plaga.fichaId !== fichaId) {
      return NextResponse.json({ error: "Plaga/enfermedad no encontrada" }, { status: 404 });
    }

    await db.plagaEnfermedad.delete({ where: { id: plagaId } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof FichaNoEditableError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/admin/fichas-tecnicas/[id]/plagas/[plagaId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
