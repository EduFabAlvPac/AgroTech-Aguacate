/**
 * Capa de datos de Configuración — Fase 1 (ADR-006). Reemplaza las 3
 * queries que vivían inline en configuracion/page.tsx.
 */
import { db } from "@/lib/db";
import type { VistaPreferida } from "@prisma/client";

export interface ConfiguracionResumen {
  user: {
    name: string | null; email: string; telefono: string | null; vistaPreferida: VistaPreferida;
    // ADR-011 Sprint 6 — pestaña "Seguridad". Se lee fresco de la BD (no de
    // la sesión JWT) porque el JWT queda cacheado hasta el próximo login;
    // así la pestaña refleja el estado real justo después de activar/
    // desactivar MFA en la misma sesión.
    mfaHabilitado: boolean;
  } | null;
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
      select: { name: true, email: true, telefono: true, vistaPreferida: true, mfaHabilitado: true },
    }),
    db.userPreferences.findUnique({ where: { userId } }),
  ]);

  return { user, prefs };
}

export interface OrganizacionResumen {
  id: string;
  nombre: string;
  tipo: string;
  plan: string;
  nit: string | null;
  ciudad: string | null;
  departamento: string | null;
  emailContacto: string | null;
  celularContacto: string | null;
}

/**
 * Datos de la Organización para la pestaña "Organización" de Configuración
 * (ADR-011 Sprint 3) — solo si `userId` es OWNER (re-chequeo fresco contra
 * BD, no solo el `esOwner` del JWT, mismo patrón que la página de Equipo).
 * null para cualquier otro rol: la pestaña ni siquiera se muestra.
 */
export async function getOrganizacionPropia(userId: string): Promise<OrganizacionResumen | null> {
  const propia = await db.membresia.findFirst({
    where: { userId, rol: "OWNER", aceptada: true, activa: true },
    select: {
      organizacion: {
        select: {
          id: true, nombre: true, tipo: true, plan: true,
          nit: true, ciudad: true, departamento: true, emailContacto: true, celularContacto: true,
        },
      },
    },
  });
  return propia?.organizacion ?? null;
}
