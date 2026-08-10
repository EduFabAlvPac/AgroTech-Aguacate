import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { fincaIdsAccesibles } from "@/lib/db/scoped";

// GET /api/compradores — compradores de las fincas accesibles al usuario (Fase 2)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const fincaIds = await fincaIdsAccesibles(session);
    if (fincaIds !== "ALL" && fincaIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const compradores = await db.comprador.findMany({
      where: fincaIds === "ALL" ? undefined : { fincaId: { in: fincaIds } },
      include: { _count: { select: { ingresos: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: compradores });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/compradores]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/compradores
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const fincaIds = await fincaIdsAccesibles(session);
    const finca =
      fincaIds === "ALL"
        ? await db.finca.findFirst({ select: { id: true } })
        : fincaIds.length > 0
          ? await db.finca.findFirst({ where: { id: { in: fincaIds } }, select: { id: true } })
          : null;
    if (!finca) {
      return NextResponse.json({ error: "Registra una finca antes de agregar compradores" }, { status: 400 });
    }
    await requireAccess(session, "comprador", "create", { fincaId: finca.id });

    const body = await req.json();
    const { nombre, tipo, ciudad, departamento, contacto, email, telefono, capacidadTon, precioKg, notas, estado } = body;

    if (!nombre || !tipo || !ciudad) {
      return NextResponse.json({ error: "nombre, tipo y ciudad son requeridos" }, { status: 400 });
    }

    const comprador = await db.comprador.create({
      data: {
        userId: session.user.id,
        fincaId: finca.id,
        nombre,
        tipo,
        ciudad,
        departamento: departamento || undefined,
        contacto: contacto || undefined,
        email: email || undefined,
        telefono: telefono || undefined,
        capacidadTon: capacidadTon ? Number(capacidadTon) : undefined,
        precioKg: precioKg ? Number(precioKg) : undefined,
        notas: notas || undefined,
        estado: estado ?? "ACTIVO",
      },
    });

    return NextResponse.json({ data: comprador }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/compradores]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
