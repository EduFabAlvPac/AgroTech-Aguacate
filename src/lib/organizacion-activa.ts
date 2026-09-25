/**
 * Organización activa — contexto para personas que pertenecen a MÁS de una
 * organización (ej. dueño de su finca y a la vez coordinador de una
 * cooperativa). Espejo de src/lib/finca-activa.ts (misma cookie httpOnly,
 * misma revalidación contra la BD en cada lectura).
 *
 * `Membresia @@unique([userId, organizacionId])` ya permitía estar en dos
 * organizaciones DISTINTAS — lo que faltaba no era el modelo sino el
 * contexto: el código elegía "la" organización con `findFirst` sin orden
 * (arbitrario con dos). Con una sola organización todo se comporta igual que
 * antes: no hay nada que elegir.
 */
import { cache } from "react";
import { cookies } from "next/headers";
import type { RolOrganizacion, TipoOrg, PlanOrganizacion, EstadoPlan } from "@prisma/client";
import { db } from "./db";
import { modulosPorDefecto } from "./modulos";

export const ORG_ACTIVA_COOKIE = "germia_org_activa";

export interface MembresiaContexto {
  organizacionId: string;
  rol: RolOrganizacion;
  esRolPrimario: boolean;
  createdAt: Date;
}

/**
 * Núcleo puro (sin BD ni cookies): qué organización queda activa.
 * 1) la de la cookie, si sigue siendo una de las suyas; 2) la marcada como
 * primaria; 3) la de OWNER más antigua; 4) la más antigua. Determinístico:
 * mismo resultado sin importar el orden en que la BD devuelva las filas.
 */
export function elegirOrganizacionActiva<T extends MembresiaContexto>(
  membresias: T[],
  valorCookie?: string | null
): T | null {
  if (membresias.length === 0) return null;
  const porAntiguedad = [...membresias].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  if (valorCookie) {
    const deCookie = porAntiguedad.find((m) => m.organizacionId === valorCookie);
    if (deCookie) return deCookie;
  }
  return (
    porAntiguedad.find((m) => m.esRolPrimario) ??
    porAntiguedad.find((m) => m.rol === "OWNER") ??
    porAntiguedad[0]
  );
}

/** Lee la cookie sin romper fuera de un request (tests, scripts). */
export async function leerCookieOrgActiva(): Promise<string | undefined> {
  try {
    return (await cookies()).get(ORG_ACTIVA_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

export interface OrganizacionDeUsuario {
  organizacionId: string;
  rol: RolOrganizacion;
  esRolPrimario: boolean;
  createdAt: Date;
  organizacion: {
    id: string;
    nombre: string;
    tipo: TipoOrg;
    plan: PlanOrganizacion;
    estadoPlan: EstadoPlan;
    esTrial: boolean;
    trialFinEn: Date | null;
  };
}

/** Organizaciones de las que `userId` es miembro aceptado y activo. */
export async function listarOrganizacionesDeUsuario(userId: string): Promise<OrganizacionDeUsuario[]> {
  return db.membresia.findMany({
    where: { userId, aceptada: true, activa: true, organizacion: { eliminadoEn: null } },
    select: {
      organizacionId: true,
      rol: true,
      esRolPrimario: true,
      createdAt: true,
      organizacion: {
        select: { id: true, nombre: true, tipo: true, plan: true, estadoPlan: true, esTrial: true, trialFinEn: true },
      },
    },
  });
}

/**
 * Dueño de la organización ACTIVA — o null si en el contexto activo la
 * persona no es OWNER. Con una sola organización equivale al `findFirst`
 * anterior. Lee la cookie internamente para que los ~22 sitios de Equipo/
 * Configuración/Fincas que ya lo llaman no cambien.
 */
export async function membresiaOwnerActiva(userId: string): Promise<{ organizacionId: string } | null> {
  const membresias = await db.membresia.findMany({
    where: { userId, aceptada: true, activa: true, organizacion: { eliminadoEn: null } },
    select: { organizacionId: true, rol: true, esRolPrimario: true, createdAt: true },
  });
  const activa = elegirOrganizacionActiva(membresias, await leerCookieOrgActiva());
  return activa?.rol === "OWNER" ? { organizacionId: activa.organizacionId } : null;
}

/** Dueño de OTRA persona, sin depender de la cookie del request — para
 * flujos públicos donde no hay contexto de quien lo pregunta (ej. canje del
 * código de un Campesino, que busca al dueño que lo creó). Determinístico:
 * la organización de OWNER más antigua. */
export async function membresiaOwnerSinContexto(userId: string): Promise<{ organizacionId: string } | null> {
  const m = await db.membresia.findFirst({
    where: { userId, rol: "OWNER", aceptada: true, activa: true, organizacion: { eliminadoEn: null } },
    select: { organizacionId: true },
    orderBy: { createdAt: "asc" },
  });
  return m ?? null;
}

export interface ContextoUsuario {
  organizaciones: OrganizacionDeUsuario[];
  /** null si la persona no pertenece a ninguna organización. */
  activa: OrganizacionDeUsuario | null;
  /** ¿Es dueño de la organización ACTIVA? (el claim `esOwner` del JWT es global). */
  esOwner: boolean;
  /** Menús visibles en la organización activa ("ALL" para dueño/Super Admin). */
  modulosPermitidos: string[] | "ALL";
}

/**
 * Contexto completo de la persona en este request. `esOwner` y
 * `modulosPermitidos` del JWT se calculan UNA vez al iniciar sesión y son
 * globales (cualquier organización); acá se recalculan para la organización
 * activa, en el servidor y frescos. Memoizado por request con `cache()`.
 */
export const getContextoUsuario = cache(async (userId: string, esSuperAdmin: boolean): Promise<ContextoUsuario> => {
  const organizaciones = await listarOrganizacionesDeUsuario(userId);
  const elegida = elegirOrganizacionActiva(organizaciones, await leerCookieOrgActiva());
  const activa = elegida ? organizaciones.find((o) => o.organizacionId === elegida.organizacionId) ?? null : null;
  const esOwner = activa?.rol === "OWNER";

  let modulosPermitidos: string[] | "ALL" = "ALL";
  if (!esSuperAdmin && !esOwner) {
    const acceso = activa
      ? await db.fincaAcceso.findFirst({
          where: { userId, finca: { organizacionId: activa.organizacionId } },
          select: { rol: true, modulos: true },
          orderBy: { createdAt: "desc" },
        })
      : null;
    modulosPermitidos = acceso ? (acceso.modulos.length > 0 ? acceso.modulos : modulosPorDefecto(acceso.rol)) : [];
  }
  return { organizaciones, activa, esOwner, modulosPermitidos };
});
