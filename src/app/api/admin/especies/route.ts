import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";

// GET /api/admin/especies — catálogo completo para el panel Super Admin
// (especie → variedades → fichas, todas las versiones, no solo PUBLICADA).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);

    const especies = await db.especieCultivo.findMany({
      include: {
        variedades: {
          include: {
            fichas: {
              orderBy: { version: "desc" },
              select: { id: true, version: true, estado: true, publicadaEn: true },
            },
            _count: { select: { cultivos: true } },
          },
          orderBy: { nombre: "asc" },
        },
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json({ data: especies });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/admin/especies]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/admin/especies — crear una nueva especie en el catálogo
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);

    const body = await req.json();
    const { slug, nombre, familia } = body;

    if (!slug || !nombre) {
      return NextResponse.json({ error: "slug y nombre son requeridos" }, { status: 400 });
    }

    const existente = await db.especieCultivo.findUnique({ where: { slug } });
    if (existente) {
      return NextResponse.json({ error: `Ya existe una especie con slug '${slug}'` }, { status: 409 });
    }

    const especie = await db.especieCultivo.create({
      data: {
        slug,
        nombre,
        familia: familia || undefined,
        // Campos legacy requeridos por EspecieCultivo (Json) — sin uso desde
        // el motor de fichas técnicas nuevo, se dejan vacíos a propósito.
        etapas: [],
        tiposRegistro: [],
      },
    });

    return NextResponse.json({ data: especie }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/admin/especies]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
