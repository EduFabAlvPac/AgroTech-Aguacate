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
  finca: {
    nombre: string; municipio: string; departamento: string;
    lat: number | null; lng: number | null; areaTotal: number | null;
  } | null;
}

export async function getConfiguracionResumen(userId: string, fincaActivaId: string | null): Promise<ConfiguracionResumen> {
  const [user, prefs, finca] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, telefono: true, vistaPreferida: true },
    }),
    db.userPreferences.findUnique({ where: { userId } }),
    fincaActivaId
      ? db.finca.findUnique({
          where: { id: fincaActivaId },
          select: { nombre: true, municipio: true, departamento: true, lat: true, lng: true, areaTotal: true },
        })
      : null,
  ]);

  return { user, prefs, finca };
}
