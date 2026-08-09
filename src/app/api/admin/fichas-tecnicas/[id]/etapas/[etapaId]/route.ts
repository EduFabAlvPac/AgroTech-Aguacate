import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";
import { assertFichaEditable, FichaNoEditableError } from "@/lib/fichas-tecnicas";

// DELETE /api/admin/fichas-tecnicas/[id]/etapas/[etapaId]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; etapaId: string }> }) {
  try {
    const { id: fichaId, etapaId } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const etapa = await db.etapaFenologica.findUnique({ where: { id: etapaId }, select: { fichaId: true } });
    if (!etapa || etapa.fichaId !== fichaId) {
      return NextResponse.json({ error: "Etapa no encontrada" }, { status: 404 });
    }

    await db.etapaFenologica.delete({ where: { id: etapaId } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof FichaNoEditableError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/admin/fichas-tecnicas/[id]/etapas/[etapaId]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
