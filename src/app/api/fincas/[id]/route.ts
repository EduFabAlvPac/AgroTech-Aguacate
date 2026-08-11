import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";

// PUT /api/fincas/[id] — editar cualquier finca accesible (no solo la activa)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const finca = await db.finca.findUnique({ where: { id }, select: { id: true } });
    if (!finca) return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
    await requireAccess(session, "finca", "update", { fincaId: id });

    const body = await req.json();
    const { nombre, municipio, departamento, altitud, lat, lng, areaTotal } = body;

    if (!nombre?.trim() || !municipio?.trim() || !departamento?.trim()) {
      return NextResponse.json({ error: "nombre, municipio y departamento son requeridos" }, { status: 400 });
    }

    const actualizada = await db.finca.update({
      where: { id },
      data: {
        nombre,
        municipio,
        departamento,
        altitud: altitud !== undefined ? (altitud === null || altitud === "" ? null : Number(altitud)) : undefined,
        lat: lat !== undefined ? (lat === null || lat === "" ? null : Number(lat)) : undefined,
        lng: lng !== undefined ? (lng === null || lng === "" ? null : Number(lng)) : undefined,
        areaTotal: areaTotal !== undefined ? (areaTotal === null || areaTotal === "" ? null : Number(areaTotal)) : undefined,
      },
    });

    return NextResponse.json({ data: actualizada });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[PUT /api/fincas/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/fincas/[id] — eliminar una finca (solo OWNER, nunca la última de la organización)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const finca = await db.finca.findUnique({
      where: { id },
      select: { id: true, organizacionId: true, _count: { select: { lotes: true } } },
    });
    if (!finca) return NextResponse.json({ error: "Finca no encontrada" }, { status: 404 });
    await requireAccess(session, "finca", "delete", { fincaId: id });

    // No dejar la organización sin ninguna finca.
    if (finca.organizacionId) {
      const totalFincas = await db.finca.count({ where: { organizacionId: finca.organizacionId } });
      if (totalFincas <= 1) {
        return NextResponse.json({ error: "No puedes eliminar tu única finca" }, { status: 409 });
      }
    }

    // Protección: no eliminar una finca con lotes (mismo criterio que ya
    // existe para Lote — "no se puede eliminar si tiene cultivos activos",
    // ver src/__tests__/properties/lote-delete-protection.property.test.ts).
    if (finca._count.lotes > 0) {
      return NextResponse.json(
        { error: `Esta finca tiene ${finca._count.lotes} lote(s) registrados. Elimínalos primero desde Cultivos/Mapa.` },
        { status: 409 }
      );
    }

    await db.finca.delete({ where: { id } });

    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/fincas/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
