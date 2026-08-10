import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAccess, AuthzError } from "@/lib/authz";
import { fincaIdsAccesibles } from "@/lib/db/scoped";
import {
  generateWeatherAlerts,
  generatePlagaAlerts,
  DEFAULT_THRESHOLDS,
  type AlertThresholds,
} from "@/lib/alert-engine";

// POST /api/alertas/generate — dispara la generación de alertas: climáticas
// (a nivel finca) + de plaga por ficha técnica (por cada cultivo activo que
// tenga una FichaTecnica pinneada con plagas configuradas — RF17). Usa la
// primera finca accesible al usuario (dueño o vía FincaAcceso — Fase 2).
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const fincaIds = await fincaIdsAccesibles(session);
    if (fincaIds !== "ALL" && fincaIds.length === 0) {
      return NextResponse.json({ error: "Registra una finca antes de generar alertas" }, { status: 400 });
    }
    const fincaWhere = fincaIds === "ALL" ? {} : { id: { in: fincaIds } };

    const [finca, userPrefs, cultivosActivos] = await Promise.all([
      db.finca.findFirst({
        where: fincaWhere,
        select: { id: true, lat: true, lng: true, municipio: true },
      }),
      db.userPreferences.findUnique({
        where: { userId: session.user.id },
        select: {
          tempMinAlert: true, tempMaxAlert: true,
          rainAlertMm: true, windAlertKmh: true, droughtDays: true,
        },
      }),
      db.cultivo.findMany({
        where: { lote: { fincaId: fincaIds === "ALL" ? undefined : { in: fincaIds } }, estado: "ACTIVO" },
        select: {
          id: true, especie: true, variedad: true, etapa: true,
          fichaTecnica: {
            select: {
              tempMinC: true,
              tempMaxC: true,
              variedad: { select: { especie: { select: { nombre: true } } } },
              plagas: { select: { id: true, nombre: true, tipo: true, manejoRecomendado: true, umbralAlerta: true } },
            },
          },
        },
      }),
    ]);

    if (!finca) {
      return NextResponse.json({ error: "Registra una finca antes de generar alertas" }, { status: 400 });
    }
    await requireAccess(session, "alerta", "create", { fincaId: finca.id });

    const lat = finca.lat ?? 8.320589;
    const lng = finca.lng ?? -73.337551;
    const municipio = finca.municipio ?? "Ocaña";

    // Contexto descriptivo de las alertas climáticas (finca-wide): se usa el
    // primer cultivo activo como referencia si existe, tanto para el texto
    // como para los umbrales de temperatura reales de su ficha técnica.
    const primero = cultivosActivos[0];
    const cropName = primero ? `${primero.especie} ${primero.variedad ?? ""}`.trim() : "cultivo";
    const cropStage = primero?.etapa ?? "SIEMBRA";

    // Prioridad de umbrales: preferencia explícita del usuario > rango de la
    // ficha técnica del cultivo (real, por especie/variedad) > default
    // genérico. Antes usaba el mismo umbral de temperatura para cualquier
    // cultivo (aguacate, café o cacao) — la ficha técnica ya trae tempMinC/
    // tempMaxC específicos por especie (motor de fichas técnicas, §4).
    const fichaTemp = primero?.fichaTecnica;
    const thresholds: AlertThresholds = {
      tempMinAlert: userPrefs?.tempMinAlert ?? fichaTemp?.tempMinC ?? DEFAULT_THRESHOLDS.tempMinAlert,
      tempMinCritical: DEFAULT_THRESHOLDS.tempMinCritical,
      tempMaxAlert: userPrefs?.tempMaxAlert ?? fichaTemp?.tempMaxC ?? DEFAULT_THRESHOLDS.tempMaxAlert,
      rainAlertMm: userPrefs?.rainAlertMm ?? DEFAULT_THRESHOLDS.rainAlertMm,
      windAlertKmh: userPrefs?.windAlertKmh ?? DEFAULT_THRESHOLDS.windAlertKmh,
      droughtDays: userPrefs?.droughtDays ?? DEFAULT_THRESHOLDS.droughtDays,
    };

    const weatherResult = await generateWeatherAlerts(lat, lng, municipio, finca.id, thresholds, { cropName, cropStage });

    // Alertas de plaga — una por cultivo activo con ficha técnica + catálogo
    // de plagas con umbral configurado.
    let plagaCreated = 0;
    let plagaSkipped = 0;
    for (const cultivo of cultivosActivos) {
      if (!cultivo.fichaTecnica || cultivo.fichaTecnica.plagas.length === 0) continue;
      const nombreCultivo = `${cultivo.fichaTecnica.variedad.especie.nombre} ${cultivo.variedad ?? ""}`.trim();
      const result = await generatePlagaAlerts(
        lat, lng, municipio, finca.id, cultivo.id, nombreCultivo, cultivo.fichaTecnica.plagas
      );
      plagaCreated += result.created;
      plagaSkipped += result.skipped;
    }

    const created = weatherResult.created + plagaCreated;
    const skipped = weatherResult.skipped + plagaSkipped;

    return NextResponse.json({
      data: {
        message: `Generación completada: ${created} alertas creadas, ${skipped} omitidas (duplicadas)`,
        created,
        skipped,
        detalle: { clima: weatherResult, plaga: { created: plagaCreated, skipped: plagaSkipped } },
      },
    });
  } catch (error) {
    console.error("[POST /api/alertas/generate]", error);
    return NextResponse.json({ error: "Error al generar alertas" }, { status: 500 });
  }
}
