import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolverVariedad } from "@/lib/fichas-tecnicas";
import { requireAccess, AuthzError } from "@/lib/authz";

// Ya no filtra por userId — la autorización real la hace requireAccess()
// contra el fincaId del lote (Fase 2). Sigue sirviendo para saber si existe
// y a qué finca pertenece.
async function fetchCultivoConFinca(cultivoId: string) {
  return db.cultivo.findUnique({
    where: { id: cultivoId },
    include: { lote: { select: { fincaId: true } } },
  });
}

// GET /api/cultivos/[id]
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await fetchCultivoConFinca(id);
    if (!existente) return NextResponse.json({ error: "Cultivo no encontrado" }, { status: 404 });
    await requireAccess(session, "cultivo", "read", { fincaId: existente.lote.fincaId });

    const cultivo = await db.cultivo.findUnique({
      where: { id },
      include: {
        lote: { include: { finca: true } },
        registros: { orderBy: { fecha: "desc" } },
        gastos: { orderBy: { fecha: "desc" } },
        ingresos: { include: { comprador: true }, orderBy: { fecha: "desc" } },
      },
    });

    return NextResponse.json({ data: cultivo });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/cultivos/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PUT /api/cultivos/[id]
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await fetchCultivoConFinca(id);
    if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await requireAccess(session, "cultivo", "update", { fincaId: existente.lote.fincaId });

    const body = await req.json();

    // Build update data dynamically — only include fields that are present in the request
    const data: Record<string, unknown> = {};

    // Catálogo de fichas técnicas (RF5): igual que en la creación, el
    // servidor resuelve especie/variedad/fichaTecnicaId a partir de
    // variedadId — nunca se confía en lo que mande el cliente.
    if (body.variedadId !== undefined) {
      if (body.variedadId === null) {
        data.variedadId = null;
        data.fichaTecnicaId = null;
      } else {
        const resuelto = await resolverVariedad(body.variedadId);
        if (!resuelto) {
          return NextResponse.json({ error: "Variedad no encontrada en el catálogo" }, { status: 400 });
        }
        data.especie = resuelto.especie;
        data.variedad = resuelto.variedad;
        data.especieId = resuelto.especieId;
        data.variedadId = resuelto.variedadId;
        data.fichaTecnicaId = resuelto.fichaTecnicaId;
      }
    } else {
      if (body.especie !== undefined) data.especie = body.especie;
      if (body.variedad !== undefined) data.variedad = body.variedad;
    }
    if (body.fechaSiembra !== undefined) data.fechaSiembra = body.fechaSiembra ? new Date(body.fechaSiembra) : null;
    if (body.cantidadPlantas !== undefined) data.cantidadPlantas = body.cantidadPlantas ? Number(body.cantidadPlantas) : null;
    if (body.densidadHa !== undefined) data.densidadHa = body.densidadHa ? Number(body.densidadHa) : null;
    if (body.etapa !== undefined) data.etapa = body.etapa;
    if (body.estado !== undefined) data.estado = body.estado;
    if (body.notas !== undefined) data.notas = body.notas || null;
    if (body.portainjerto !== undefined) data.portainjerto = body.portainjerto || null;
    if (body.proveedorMaterial !== undefined) data.proveedorMaterial = body.proveedorMaterial || null;
    if (body.sistemaSiembra !== undefined) data.sistemaSiembra = body.sistemaSiembra || null;
    if (body.distanciaSiembra !== undefined) data.distanciaSiembra = body.distanciaSiembra || null;
    if (body.observaciones !== undefined) data.observaciones = body.observaciones || null;

    const cultivo = await db.cultivo.update({
      where: { id },
      data: data as any,
      include: {
        lote: { include: { finca: true } },
        registros: { orderBy: { fecha: "desc" }, take: 5 },
        _count: { select: { registros: true, gastos: true } },
      },
    });

    return NextResponse.json({ data: cultivo });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[PUT /api/cultivos/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/cultivos/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const existente = await fetchCultivoConFinca(id);
    if (!existente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    await requireAccess(session, "cultivo", "delete", { fincaId: existente.lote.fincaId });

    await db.cultivo.delete({ where: { id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[DELETE /api/cultivos/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
