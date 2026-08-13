import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generarAlertasParaFinca } from "@/lib/alert-engine";

// Nunca cachear esta ruta — cada ejecución del cron debe leer clima/BD
// frescos, no una respuesta estática de un build anterior.
export const dynamic = "force-dynamic";

// GET /api/cron/generar-alertas — Vercel Cron (ver vercel.json, 1x/día).
// Genera automáticamente alertas de clima/plaga/calendario de manejo para
// TODAS las fincas, sin depender de que un usuario abra la app y haga clic
// en "Generar alertas" (antes era 100% manual — ver alert-engine.ts).
//
// Sin sesión de usuario (un cron no tiene una): se protege verificando
// CRON_SECRET en el header Authorization, patrón recomendado por Vercel
// (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
// Nunca usar requireAccess() aquí — no hay un usuario al que autorizar,
// es un job de sistema confiable solo por el secreto compartido.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const fincas = await db.finca.findMany({
      where: { organizacionId: { not: null } },
      select: { id: true, nombre: true },
    });

    let totalCreated = 0;
    let totalSkipped = 0;
    const porFinca: { fincaId: string; nombre: string; created: number; skipped: number; error?: string }[] = [];

    for (const finca of fincas) {
      try {
        const resultado = await generarAlertasParaFinca(finca.id);
        totalCreated += resultado.created;
        totalSkipped += resultado.skipped;
        porFinca.push({ fincaId: finca.id, nombre: finca.nombre, created: resultado.created, skipped: resultado.skipped });
      } catch (err) {
        // Una finca con error (ej. clima no disponible) no debe tumbar el
        // resto del cron — se registra y se sigue con las demás.
        console.error(`[cron/generar-alertas] Error en finca ${finca.id}`, err);
        porFinca.push({ fincaId: finca.id, nombre: finca.nombre, created: 0, skipped: 0, error: "Error al generar" });
      }
    }

    console.log(`[cron/generar-alertas] ${fincas.length} fincas procesadas — ${totalCreated} creadas, ${totalSkipped} omitidas`);

    return NextResponse.json({
      data: {
        fincasProcesadas: fincas.length,
        totalCreated,
        totalSkipped,
        porFinca,
      },
    });
  } catch (error) {
    console.error("[GET /api/cron/generar-alertas]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
