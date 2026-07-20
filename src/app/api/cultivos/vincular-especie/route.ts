import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/cultivos/vincular-especie
// Body: { cultivoId: string, especieSlug: string }
// Links an existing cultivo to its parametric EspecieCultivo record.
// Used for gradual migration of existing cultivos to the new system.

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { cultivoId, especieSlug } = body;

    if (!cultivoId || !especieSlug) {
      return NextResponse.json(
        { error: "cultivoId y especieSlug son requeridos" },
        { status: 400 }
      );
    }

    // Verify ownership of the cultivo
    const cultivo = await db.cultivo.findFirst({
      where: {
        id: cultivoId,
        lote: { finca: { userId: session.user.id } },
      },
    });

    if (!cultivo) {
      return NextResponse.json({ error: "Cultivo no encontrado" }, { status: 404 });
    }

    // Find the target species
    const especie = await db.especieCultivo.findUnique({
      where: { slug: especieSlug },
    });

    if (!especie) {
      return NextResponse.json(
        { error: `Especie '${especieSlug}' no encontrada en el catálogo` },
        { status: 404 }
      );
    }

    // Update the cultivo with the species link
    const updated = await db.cultivo.update({
      where: { id: cultivoId },
      data: {
        especieId: especie.id,
        especie: especie.nombre.split(" ")[0], // Sync string field: "Aguacate", "Café"
        variedad: especie.nombre.split(" ").slice(1).join(" ") || cultivo.variedad, // "Hass", "Caturra"
      },
      include: {
        especieCultivo: { select: { slug: true, nombre: true, etapas: true } },
      },
    });

    return NextResponse.json({
      data: {
        cultivoId: updated.id,
        especieSlug: especie.slug,
        especieNombre: especie.nombre,
        message: `Cultivo vinculado exitosamente a '${especie.nombre}'`,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/cultivos/vincular-especie]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// GET /api/cultivos/vincular-especie — list available species for dropdown
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const especies = await db.especieCultivo.findMany({
      where: { activo: true },
      select: {
        id: true,
        slug: true,
        nombre: true,
        familia: true,
        etapas: true,
        altitudMin: true,
        altitudMax: true,
        cicloMesesPrimeraCosecha: true,
      },
      orderBy: { nombre: "asc" },
    });

    return NextResponse.json({ data: especies });
  } catch (error) {
    console.error("[GET /api/cultivos/vincular-especie]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
