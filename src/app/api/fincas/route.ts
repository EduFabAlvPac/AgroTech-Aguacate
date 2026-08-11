import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { fincaIdsAccesibles } from "@/lib/db/scoped";

/**
 * Gestión de fincas (funcionalidad de fincas — multi-finca real). Antes no
 * existía NINGÚN flujo en la app para crear una finca — la única finca del
 * piloto se creó por fuera de la aplicación (seed/backfill manual).
 */

// GET /api/fincas — fincas accesibles al usuario (para el selector)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const fincaIds = await fincaIdsAccesibles(session);
    const fincas = await db.finca.findMany({
      where: fincaIds === "ALL" ? undefined : { id: { in: fincaIds } },
      select: { id: true, nombre: true, municipio: true, departamento: true, areaTotal: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: fincas });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/fincas]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/fincas — crear una nueva finca en la organización del usuario
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    // Solo el OWNER de una organización puede crear fincas nuevas (la matriz
    // de authz.ts no le da "create" sobre "finca" a ADMIN_FINCA/COLABORADOR
    // — son roles scoped a fincas ya existentes, ver CLAUDE.md §2.3).
    const propia = await db.membresia.findFirst({
      where: { userId: session.user.id, rol: "OWNER", aceptada: true, activa: true },
      select: { organizacionId: true },
    });
    if (!propia) {
      return NextResponse.json({ error: "Solo el dueño de la organización puede crear fincas" }, { status: 403 });
    }
    await requireAccess(session, "finca", "create", { organizacionId: propia.organizacionId });

    const body = await req.json();
    const { nombre, municipio, departamento, altitud, lat, lng, areaTotal } = body;

    if (!nombre || !municipio || !departamento) {
      return NextResponse.json({ error: "nombre, municipio y departamento son requeridos" }, { status: 400 });
    }

    const finca = await db.finca.create({
      data: {
        nombre,
        municipio,
        departamento,
        altitud: altitud ? Number(altitud) : undefined,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        areaTotal: areaTotal ? Number(areaTotal) : undefined,
        userId: session.user.id,
        organizacionId: propia.organizacionId,
      },
    });

    return NextResponse.json({ data: finca }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/fincas]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
