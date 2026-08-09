import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";

// POST /api/admin/fichas-tecnicas/[id]/publicar
// Publica una ficha BORRADOR: archiva la versión PUBLICADA anterior de la
// misma variedad (si existe) y marca esta como PUBLICADA. Ver ADR-002 —
// cultivos ya pinneados a la versión archivada no se ven afectados.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);

    const ficha = await db.fichaTecnica.findUnique({ where: { id } });
    if (!ficha) return NextResponse.json({ error: "Ficha técnica no encontrada" }, { status: 404 });
    if (ficha.estado !== "BORRADOR") {
      return NextResponse.json({ error: "Solo se puede publicar una ficha en BORRADOR" }, { status: 400 });
    }

    const publicada = await db.$transaction(async (tx) => {
      await tx.fichaTecnica.updateMany({
        where: { variedadId: ficha.variedadId, estado: "PUBLICADA" },
        data: { estado: "ARCHIVADA" },
      });

      return tx.fichaTecnica.update({
        where: { id },
        data: { estado: "PUBLICADA", publicadaEn: new Date() },
      });
    });

    return NextResponse.json({ data: publicada });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/admin/fichas-tecnicas/[id]/publicar]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
