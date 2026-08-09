import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";
import { assertFichaEditable, FichaNoEditableError } from "@/lib/fichas-tecnicas";

// POST /api/admin/fichas-tecnicas/[id]/plagas — agregar plaga/enfermedad
// Catálogo base para el futuro diagnóstico IA por imagen (RF15).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: fichaId } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);
    await assertFichaEditable(fichaId);

    const body = await req.json();
    const { nombre, tipo, sintomas, manejoRecomendado } = body;
    if (!nombre || !tipo) {
      return NextResponse.json({ error: "nombre y tipo son requeridos" }, { status: 400 });
    }

    const plaga = await db.plagaEnfermedad.create({
      data: {
        fichaId,
        nombre,
        tipo,
        sintomas: sintomas || undefined,
        manejoRecomendado: manejoRecomendado || undefined,
        imagenesRef: [],
        etapasSusceptibles: [],
      },
    });

    return NextResponse.json({ data: plaga }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof FichaNoEditableError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/admin/fichas-tecnicas/[id]/plagas]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
