import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { fincaIdsAccesibles } from "@/lib/db/scoped";

// GET /api/alertas — scoped a las fincas accesibles al usuario (dueño o vía
// FincaAcceso — Fase 2. Antes usaba `finca: { userId }` literal, que dejaba
// a colaboradores/administradores de finca sin ver ni poder gestionar las
// alertas de una finca que no fuera literalmente de su propiedad).
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const soloActivas = searchParams.get("activas") === "true";
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const fincaIds = await fincaIdsAccesibles(session);
    const scope: any = fincaIds === "ALL" ? {} : { fincaId: { in: fincaIds } };

    const alertas = await db.alertaClimatica.findMany({
      where: soloActivas ? { ...scope, activa: true } : scope,
      orderBy: [{ activa: "desc" }, { createdAt: "desc" }],
      take: limit,
    });

    const noLeidas = await db.alertaClimatica.count({
      where: { ...scope, activa: true, leida: false },
    });

    return NextResponse.json({ data: alertas, meta: { noLeidas } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/alertas]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/alertas — crear alerta manual, atada a una finca accesible al usuario
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const fincaIds = await fincaIdsAccesibles(session);
    const finca =
      fincaIds === "ALL"
        ? await db.finca.findFirst({ select: { id: true } })
        : fincaIds.length > 0
          ? await db.finca.findFirst({ where: { id: { in: fincaIds } }, select: { id: true } })
          : null;
    if (!finca) {
      return NextResponse.json({ error: "Registra una finca antes de crear alertas" }, { status: 400 });
    }
    await requireAccess(session, "alerta", "create", { fincaId: finca.id });

    const body = await req.json();
    const { tipo, titulo, descripcion, severidad, fechaInicio, municipio } = body;

    if (!tipo || !titulo || !descripcion) {
      return NextResponse.json(
        { error: "tipo, titulo y descripcion son requeridos" },
        { status: 400 }
      );
    }

    const alerta = await db.alertaClimatica.create({
      data: {
        tipo,
        titulo,
        descripcion,
        severidad: severidad ?? "MEDIA",
        fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
        activa: true,
        leida: false,
        municipio: municipio ?? "Norte de Santander",
        fincaId: finca.id,
      },
    });

    return NextResponse.json({ data: alerta }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/alertas]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
