import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { enviarEmailTrialPorVencer } from "@/lib/email";
import { avisoPendiente, diasRestantesTrial, estadoEfectivoOrg } from "@/lib/plan";

export const dynamic = "force-dynamic";

// GET /api/cron/trial-avisos — Vercel Cron (vercel.json, 1x/día: cabe en el
// plan Hobby). Para cada organización en trial: manda el correo de aviso que
// toque (7, 3, 1 días antes y el día del vencimiento) al/los dueños, una sola
// vez por umbral, y al vencer marca estadoPlan = SUSPENDIDA_PAGO para que el
// Super Admin lo vea. El BLOQUEO de escritura NO depende de este cron: se
// calcula de las fechas (src/lib/plan.ts), así que un día sin cron no deja a
// nadie escribiendo de más. Mismo patrón de CRON_SECRET que generar-alertas.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const orgs = await db.organizacion.findMany({
      where: { esTrial: true, eliminadoEn: null },
      select: {
        id: true, nombre: true, esTrial: true, trialFinEn: true, estadoPlan: true,
        trialMaxAsociados: true, limiteAsociadosPlan: true, configuracion: true,
        membresias: { where: { rol: "OWNER", aceptada: true, activa: true }, select: { user: { select: { email: true, name: true } } } },
      },
    });

    let avisos = 0;
    let suspendidas = 0;
    for (const org of orgs) {
      try {
        const dias = diasRestantesTrial(org);
        if (dias === null) continue;
        const cfg = (org.configuracion && typeof org.configuracion === "object" ? org.configuracion : {}) as Record<string, unknown>;
        const enviados = Array.isArray(cfg.trialAvisos) ? (cfg.trialAvisos as number[]) : [];

        const pendiente = avisoPendiente(dias, enviados);
        if (pendiente) {
          for (const m of org.membresias) await enviarEmailTrialPorVencer(m.user.email, m.user.name, org.nombre, pendiente.enviar);
          // Se marca DESPUÉS de enviar; si el proceso cae a medias, el peor caso
          // es repetir un aviso al día siguiente, nunca perderlo.
          await db.organizacion.update({
            where: { id: org.id },
            data: { configuracion: { ...cfg, trialAvisos: [...new Set([...enviados, ...pendiente.marcar])] } as Prisma.InputJsonValue },
          });
          avisos++;
        }

        if (estadoEfectivoOrg(org) === "TRIAL_VENCIDO" && org.estadoPlan !== "SUSPENDIDA_PAGO") {
          await db.organizacion.update({ where: { id: org.id }, data: { estadoPlan: "SUSPENDIDA_PAGO" } });
          suspendidas++;
        }
      } catch (error) {
        // Una organización con problema no debe frenar al resto.
        console.error(`[cron trial-avisos] organización ${org.id}`, error);
      }
    }

    return NextResponse.json({ ok: true, organizaciones: orgs.length, avisos, suspendidas });
  } catch (error) {
    console.error("[GET /api/cron/trial-avisos]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
