import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";
import { assertFichaEditable, FichaNoEditableError } from "@/lib/fichas-tecnicas";

// POST /api/admin/fichas-tecnicas/[id]/etapas — agregar etapa fenológica
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: fichaId } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const body = await req.json();
    const { nombre, duracionDiasMin, duracionDiasMax, descripcion } = body;
    if (!nombre) return NextResponse.json({ error: "nombre es requerido" }, { status: 400 });

    const ultima = await db.etapaFenologica.findFirst({
      where: { fichaId },
      orderBy: { orden: "desc" },
      select: { orden: true },
    });

    const etapa = await db.etapaFenologica.create({
      data: {
        fichaId,
        orden: (ultima?.orden ?? 0) + 1,
        nombre,
        duracionDiasMin: duracionDiasMin ? Number(duracionDiasMin) : undefined,
        duracionDiasMax: duracionDiasMax ? Number(duracionDiasMax) : undefined,
        descripcion: descripcion || undefined,
      },
    });

    return NextResponse.json({ data: etapa }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof FichaNoEditableError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/admin/fichas-tecnicas/[id]/etapas]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
