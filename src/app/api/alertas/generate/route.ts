import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateWeatherAlerts, DEFAULT_THRESHOLDS } from "@/lib/alert-engine";

// POST /api/alertas/generate — trigger alert generation from weather forecast
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const finca = await db.finca.findFirst({
      where: { userId: session.user.id },
      select: { lat: true, lng: true, municipio: true },
    });

    const lat = finca?.lat ?? 7.9273;
    const lng = finca?.lng ?? -72.5078;
    const municipio = finca?.municipio ?? "Norte de Santander";

    const result = await generateWeatherAlerts(lat, lng, municipio, DEFAULT_THRESHOLDS);

    return NextResponse.json({
      data: {
        message: `Generación completada: ${result.created} alertas creadas, ${result.skipped} omitidas (duplicadas)`,
        ...result,
      },
    });
  } catch (error) {
    console.error("[POST /api/alertas/generate]", error);
    return NextResponse.json({ error: "Error al generar alertas" }, { status: 500 });
  }
}
