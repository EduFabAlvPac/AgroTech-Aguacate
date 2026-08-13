import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { resolverFincaActiva } from "@/lib/finca-activa";
import { generarAlertasParaFinca } from "@/lib/alert-engine";

// POST /api/alertas/generate — dispara la generación de alertas para la
// finca activa del usuario (botón "Generar alertas" en /dashboard/alertas):
// climáticas (a nivel finca), de plaga por ficha técnica (RF17) y de
// calendario de manejo proyectado (RF17/RF18). Toda la lógica real vive en
// generarAlertasParaFinca() (src/lib/alert-engine.ts) — la misma función que
// usa el cron diario (GET /api/cron/generar-alertas), para que "generar
// ahora" y "generación automática" nunca diverjan en comportamiento.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { fincaActivaId } = await resolverFincaActiva(session);
    if (!fincaActivaId) {
      return NextResponse.json({ error: "Registra una finca antes de generar alertas" }, { status: 400 });
    }

    const finca = await db.finca.findUnique({ where: { id: fincaActivaId }, select: { id: true } });
    if (!finca) {
      return NextResponse.json({ error: "Registra una finca antes de generar alertas" }, { status: 400 });
    }
    await requireAccess(session, "alerta", "create", { fincaId: finca.id });

    const resultado = await generarAlertasParaFinca(finca.id);

    return NextResponse.json({
      data: {
        message: `Generación completada: ${resultado.created} alertas creadas, ${resultado.skipped} omitidas (duplicadas)`,
        created: resultado.created,
        skipped: resultado.skipped,
        detalle: resultado.detalle,
      },
    });
  } catch (error) {
    if (error instanceof AuthzError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[POST /api/alertas/generate]", error);
    return NextResponse.json({ error: "Error al generar alertas" }, { status: 500 });
  }
}
