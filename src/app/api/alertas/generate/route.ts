import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateWeatherAlerts, DEFAULT_THRESHOLDS, type AlertThresholds } from "@/lib/alert-engine";

// POST /api/alertas/generate — trigger alert generation from weather forecast
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Fetch finca + user preferences + active crop info
    const [finca, userPrefs, activeCultivo] = await Promise.all([
      db.finca.findFirst({
        where: { userId: session.user.id },
        select: { lat: true, lng: true, municipio: true },
      }),
      db.userPreferences.findUnique({
        where: { userId: session.user.id },
        select: {
          tempMinAlert: true, tempMaxAlert: true,
          rainAlertMm: true, windAlertKmh: true, droughtDays: true,
        },
      }),
      db.cultivo.findFirst({
        where: { lote: { finca: { userId: session.user.id } }, estado: "ACTIVO" },
        select: { especie: true, variedad: true, etapa: true, fechaSiembra: true },
      }),
    ]);

    const lat = finca?.lat ?? 8.2393;
    const lng = finca?.lng ?? -73.3556;
    const municipio = finca?.municipio ?? "Norte de Santander";

    // Build thresholds from user preferences (fallback to defaults)
    const thresholds: AlertThresholds = {
      tempMinAlert: userPrefs?.tempMinAlert ?? DEFAULT_THRESHOLDS.tempMinAlert,
      tempMinCritical: DEFAULT_THRESHOLDS.tempMinCritical,
      tempMaxAlert: userPrefs?.tempMaxAlert ?? DEFAULT_THRESHOLDS.tempMaxAlert,
      rainAlertMm: userPrefs?.rainAlertMm ?? DEFAULT_THRESHOLDS.rainAlertMm,
      windAlertKmh: userPrefs?.windAlertKmh ?? DEFAULT_THRESHOLDS.windAlertKmh,
      droughtDays: userPrefs?.droughtDays ?? DEFAULT_THRESHOLDS.droughtDays,
    };

    // Build crop context for parametrized alert descriptions
    const cropName = activeCultivo
      ? `${activeCultivo.especie} ${activeCultivo.variedad ?? ""}`.trim()
      : "cultivo";
    const cropStage = activeCultivo?.etapa ?? "SIEMBRA";

    const result = await generateWeatherAlerts(lat, lng, municipio, thresholds, { cropName, cropStage });

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
