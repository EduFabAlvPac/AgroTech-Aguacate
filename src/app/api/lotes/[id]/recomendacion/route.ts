import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { generarRecomendaciones } from "@/lib/agronomia/recomendacion-cultivo";

// GET /api/lotes/[id]/recomendacion — ¿qué cultivo/variedad sembrar en este
// lote? Cruza Lote.altitud + pH del último AnalisisSuelo contra el rango
// óptimo de cada FichaTecnica publicada (RF3, ver lib/agronomia/recomendacion-cultivo.ts).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: loteId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const lote = await db.lote.findUnique({ where: { id: loteId }, select: { id: true, altitud: true, fincaId: true } });
    if (!lote) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
    await requireAccess(session, "lote", "read", { fincaId: lote.fincaId });

    const [ultimoAnalisis, fichas] = await Promise.all([
      db.analisisSuelo.findFirst({ where: { loteId }, orderBy: { fechaMuestreo: "desc" }, select: { ph: true, fechaMuestreo: true } }),
      db.fichaTecnica.findMany({
        where: { estado: "PUBLICADA" },
        select: {
          id: true,
          altitudMinM: true,
          altitudMaxM: true,
          phMin: true,
          phMax: true,
          variedad: { select: { nombre: true, especie: { select: { nombre: true } } } },
        },
      }),
    ]);

    const candidatas = fichas.map((f) => ({
      fichaTecnicaId: f.id,
      especie: f.variedad.especie.nombre,
      variedad: f.variedad.nombre,
      altitudMinM: f.altitudMinM,
      altitudMaxM: f.altitudMaxM,
      phMin: f.phMin,
      phMax: f.phMax,
    }));

    const recomendaciones = generarRecomendaciones(lote.altitud, ultimoAnalisis?.ph ?? null, candidatas);

    return NextResponse.json({
      data: {
        loteAltitud: lote.altitud,
        ultimoAnalisisPh: ultimoAnalisis?.ph ?? null,
        ultimoAnalisisFecha: ultimoAnalisis?.fechaMuestreo ?? null,
        recomendaciones, // null si el lote no tiene altitud registrada
      },
    });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[GET /api/lotes/[id]/recomendacion]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
