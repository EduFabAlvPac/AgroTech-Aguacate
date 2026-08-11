import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { requireAccess, AuthzError } from "@/lib/authz";
import { resolverFincaActiva, SIN_FINCA_SENTINEL } from "@/lib/finca-activa";

// GET /api/lotes — lotes de la finca activa (funcionalidad de fincas)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { fincaActivaId } = await resolverFincaActiva(session);

    const lotes = await db.lote.findMany({
      where: { fincaId: fincaActivaId ?? SIN_FINCA_SENTINEL },
      include: {
        cultivos: {
          where: { estado: "ACTIVO" },
          take: 1,
        },
      },
    });

    return NextResponse.json({ data: lotes });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
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

    // Si viene fincaId en el body, usarlo; si no, la finca activa del
    // selector del sidebar (funcionalidad de fincas).
    let fincaId = body.fincaId as string | undefined;

    if (!fincaId) {
      const { fincaActivaId } = await resolverFincaActiva(session);
      if (!fincaActivaId) {
        return NextResponse.json({ error: "Finca no encontrada. Configura tu finca primero." }, { status: 404 });
      }
      fincaId = fincaActivaId;
    } else {
      const finca = await db.finca.findUnique({ where: { id: fincaId }, select: { id: true } });
      if (!finca) {
        return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
      }
    }

    await requireAccess(session, "lote", "create", { fincaId });

    // Validar campos requeridos
    const nombre = body.nombre?.trim();
    if (!nombre) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const areaHa = Number(body.areaHa);
    if (!areaHa || areaHa <= 0) {
      return NextResponse.json({ error: "El área debe ser mayor a 0" }, { status: 400 });
    }

    const data: Prisma.LoteCreateInput = {
      nombre,
      areaHa,
      altitud: body.altitud ? Number(body.altitud) : undefined,
      pendiente: body.pendiente ? Number(body.pendiente) : undefined,
      notas: body.notas ?? undefined,
      lat: body.lat ? Number(body.lat) : undefined,
      lng: body.lng ? Number(body.lng) : undefined,
      finca: { connect: { id: fincaId } },
      ...(body.geoJson ? { geoJson: body.geoJson as Prisma.InputJsonValue } : {}),
    };

    const lote = await db.lote.create({ data });

    return NextResponse.json({ data: lote }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/lotes]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
