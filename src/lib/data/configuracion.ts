/**
 * Capa de datos de Configuración — Fase 1 (ADR-006). Reemplaza las 3
 * queries que vivían inline en configuracion/page.tsx.
 */
import { db } from "@/lib/db";
import type { VistaPreferida } from "@prisma/client";

export interface ConfiguracionResumen {
  user: { name: string | null; email: string; telefono: string | null; vistaPreferida: VistaPreferida } | null;
  prefs: {
    tempMinAlert: number; tempMaxAlert: number;
    rainAlertMm: number; windAlertKmh: number;
    droughtDays: number; emailAlerts: boolean; pushAlerts: boolean;
  } | null;
}

// Ya no devuelve una sola "finca activa" (hallazgo del usuario, 2026-09-21:
// la pestaña "Finca" pasó de editar una implícita a listar/crear/editar/
// eliminar todas — ver FincasTab.tsx, que recibe la lista completa vía
// getFincas() de src/lib/data/fincas.ts, la misma que ya usaba "Mis fincas").
export async function getConfiguracionResumen(userId: string): Promise<ConfiguracionResumen> {
  const [user, prefs] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, telefono: true, vistaPreferida: true },
    }),
    db.userPreferences.findUnique({ where: { userId } }),
  ]);

  return { user, prefs };
}
