import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { loteCreateWithGeoSchema } from "@/lib/validations";
import type { Prisma } from "@prisma/client";

// GET /api/lotes — listar todos los lotes de la finca del usuario
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const finca = await db.finca.findFirst({
      where: { userId: session.user.id },
      include: {
        lotes: {
          include: {
            cultivos: {
              where: { estado: "ACTIVO" },
              take: 1,
            },
          },
        },
      },
    });

    return NextResponse.json({ data: finca?.lotes ?? [] });
  } catch (error) {
    console.error("[GET /api/lotes]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/lotes — crear un nuevo lote
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = loteCreateWithGeoSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { nombre, areaHa, altitud, pendiente, notas, fincaId, geoJson, lat, lng } = parsed.data;

    // Verificar que la finca pertenece al usuario autenticado
    const finca = await db.finca.findUnique({
      where: { id: fincaId },
      select: { userId: true },
    });

    if (!finca) {
      return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
    }

    if (finca.userId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const data: Prisma.LoteCreateInput = {
      nombre,
      areaHa,
      altitud: altitud ?? undefined,
      pendiente: pendiente ?? undefined,
      notas: notas ?? undefined,
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      finca: { connect: { id: fincaId } },
      ...(geoJson ? { geoJson: geoJson as Prisma.InputJsonValue } : {}),
    };

    const lote = await db.lote.create({ data });

    return NextResponse.json({ data: lote }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/lotes]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
