import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireSuperAdmin, AuthzError } from "@/lib/authz";

// POST /api/admin/fichas-tecnicas — crear una nueva versión de ficha técnica
// para una variedad. Body: { variedadId, clonarEtapasDeVersionId? }
// La nueva versión siempre nace en BORRADOR (ADR-002) — no afecta cultivos ya
// pinneados a una versión anterior.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    await requireSuperAdmin(session);

    const body = await req.json();
    const { variedadId, clonarEtapasDeVersionId } = body;

    if (!variedadId) {
      return NextResponse.json({ error: "variedadId es requerido" }, { status: 400 });
    }

    const variedad = await db.variedad.findUnique({ where: { id: variedadId } });
    if (!variedad) return NextResponse.json({ error: "Variedad no encontrada" }, { status: 404 });

    const ultima = await db.fichaTecnica.findFirst({
      where: { variedadId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const siguienteVersion = (ultima?.version ?? 0) + 1;

    let etapasClonadas: { orden: number; nombre: string; duracionDiasMin: number | null; duracionDiasMax: number | null; descripcion: string | null }[] = [];
    if (clonarEtapasDeVersionId) {
      const origen = await db.etapaFenologica.findMany({
        where: { fichaId: clonarEtapasDeVersionId },
        orderBy: { orden: "asc" },
        select: { orden: true, nombre: true, duracionDiasMin: true, duracionDiasMax: true, descripcion: true },
      });
      etapasClonadas = origen;
    }

    const ficha = await db.fichaTecnica.create({
      data: {
        variedadId,
        version: siguienteVersion,
        estado: "BORRADOR",
        creadoPorId: session!.user.id,
        etapas: etapasClonadas.length > 0 ? { create: etapasClonadas } : undefined,
      },
    });

    return NextResponse.json({ data: ficha }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/admin/fichas-tecnicas]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
