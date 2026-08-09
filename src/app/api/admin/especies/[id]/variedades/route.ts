import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";

// POST /api/admin/especies/[id]/variedades — crear una variedad bajo una especie
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: especieId } = await params;
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);

    const especie = await db.especieCultivo.findUnique({ where: { id: especieId } });
    if (!especie) return NextResponse.json({ error: "Especie no encontrada" }, { status: 404 });

    const body = await req.json();
    const { nombre, slug } = body;
    if (!nombre || !slug) {
      return NextResponse.json({ error: "nombre y slug son requeridos" }, { status: 400 });
    }

    const existente = await db.variedad.findUnique({ where: { especieId_slug: { especieId, slug } } });
    if (existente) {
      return NextResponse.json({ error: `Ya existe una variedad con slug '${slug}' en esta especie` }, { status: 409 });
    }

    const variedad = await db.variedad.create({
      data: { especieId, nombre, slug },
    });

    return NextResponse.json({ data: variedad }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/admin/especies/[id]/variedades]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
