import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";
import { assertFichaEditable, FichaNoEditableError } from "@/lib/fichas-tecnicas";

// POST /api/admin/fichas-tecnicas/[id]/costos — agregar costo de referencia
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: fichaId } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const body = await req.json();
    const { categoria, montoPorHa, montoPorPlanta, frecuencia, descripcion } = body;
    if (!categoria) return NextResponse.json({ error: "categoria es requerida" }, { status: 400 });

    const costo = await db.costoReferencia.create({
      data: {
        fichaId,
        categoria,
        montoPorHa: montoPorHa ? Number(montoPorHa) : undefined,
        montoPorPlanta: montoPorPlanta ? Number(montoPorPlanta) : undefined,
        frecuencia: frecuencia || undefined,
        descripcion: descripcion || undefined,
      },
    });

    return NextResponse.json({ data: costo }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof FichaNoEditableError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/admin/fichas-tecnicas/[id]/costos]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
