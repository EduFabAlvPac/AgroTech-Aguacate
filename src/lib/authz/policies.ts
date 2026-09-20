/**
 * Políticas de autorización del ADR-011 — funciones PURAS (sin BD, sin
 * sesión, sin Next.js) que deciden si un conjunto de membresías puede ejecutar
 * un permiso sobre un objetivo. Pensadas para usarse tanto en el servidor
 * (`requireAccess`, Sprint 2) como en el cliente (`usePermission()`), y para
 * poder testearse sin mocks.
 *
 * ESTADO: sin enchufar a ninguna ruta todavía — ver permissions.ts. Reglas de
 * diseño (ADR-011 §7, A.8.3 "Deny by default"):
 *  - Todo lo que no esté explícitamente permitido, se deniega: sin membresías,
 *    permiso desconocido, celda vacía, membresía que no esté ACTIVA.
 *  - Falla cerrada: si el rol necesita un scope (organización/finca/cultivo) y
 *    el objetivo no lo informa, se deniega en vez de asumir.
 *  - Varias membresías activas se combinan por UNIÓN (ADR §2.1: "un mismo User
 *    puede tener varias Memberships"), cada una dentro de SU propio scope.
 */
import type { EstadoMembresia, Rol, RolOrganizacion, TipoOrg } from "@prisma/client";
import {
  MATRIZ,
  detalleCelda,
  type Accion,
  type NombreCondicion,
  type Permiso,
  type Recurso,
} from "./permissions";

/** Una membresía tal como la necesita el evaluador (subconjunto de `Membresia`). */
export interface MembresiaContexto {
  rol: Rol;
  organizacionId: string;
  /** Scope de finca — obligatorio para los roles FARM_*. */
  fincaId?: string | null;
  /** Requerido (sin default a propósito): solo cuenta ACTIVA. */
  estado: EstadoMembresia;
  /** Solo INVESTOR: ids de los cultivos que financia (se deriva de InversionCultivo). */
  cultivosFinanciados?: readonly string[];
}

/** Sobre qué se quiere actuar. Cada campo lo informa quien llama, desde el recurso real. */
export interface ObjetivoAutorizacion {
  organizacionId?: string;
  fincaId?: string;
  cultivoId?: string;
  /** Tipo de la organización dueña del recurso (para la condición `org_individual`). */
  tipoOrg?: TipoOrg;
  /** El acceso llega por un EnlaceCompartido vigente (BUYER). */
  viaEnlaceCompartido?: boolean;
  /** Al invitar/otorgar: el rol que se quiere dar (para `invitar_rol_inferior`). */
  rolObjetivo?: Rol;
}

const ROLES_ORG: readonly Rol[] = ["ORG_OWNER", "ORG_ADMIN"];
const ROLES_FINCA: readonly Rol[] = ["FARM_OWNER", "FARM_ADMIN", "FARM_COLLABORATOR"];

/** Rango dentro de una finca: menor número = más autoridad. */
const RANGO_FINCA: Partial<Record<Rol, number>> = { FARM_OWNER: 0, FARM_ADMIN: 1, FARM_COLLABORATOR: 2 };

function mismaOrg(m: MembresiaContexto, o: ObjetivoAutorizacion): boolean {
  return o.organizacionId !== undefined && o.organizacionId === m.organizacionId;
}

function mismaFinca(m: MembresiaContexto, o: ObjetivoAutorizacion): boolean {
  return mismaOrg(m, o) && !!m.fincaId && o.fincaId === m.fincaId;
}

/**
 * Regla base de scope cuando la celda NO trae condición:
 *  - plataforma (SUPPORT): global.
 *  - rol de organización: la organización del objetivo debe ser la suya.
 *  - rol de finca: misma organización Y misma finca (esto ya cubre los `R*` de
 *    "solo su scope", ej. Audit log de FARM_OWNER).
 *  - INVESTOR/BUYER: solo tienen celdas condicionadas; si alguien agrega una
 *    sin condición, al menos exige la misma organización.
 */
function alcanceBase(m: MembresiaContexto, o: ObjetivoAutorizacion): boolean {
  if (m.rol === "PLATFORM_SUPPORT") return true;
  if (ROLES_ORG.includes(m.rol)) return mismaOrg(m, o);
  if (ROLES_FINCA.includes(m.rol)) return mismaFinca(m, o);
  return mismaOrg(m, o);
}

/**
 * Los `*` de la matriz del ADR (ver interpretación 2 en permissions.ts). Cada
 * condición REEMPLAZA a la regla base de scope para esa celda: decide todo.
 */
export const CONDICIONES: Record<
  NombreCondicion,
  (m: MembresiaContexto, o: ObjetivoAutorizacion, accion: Accion) => boolean
> = {
  // Facturación de FARM_OWNER: solo en una org INDIVIDUAL (él es quien contrata y paga).
  org_individual: (m, o) => mismaOrg(m, o) && o.tipoOrg === "INDIVIDUAL",

  // Invitar: leer las invitaciones de su finca sí; crear/editar solo hacia un
  // rol de rango ESTRICTAMENTE inferior (FARM_OWNER→ADMIN/COLLAB, FARM_ADMIN→COLLAB).
  invitar_rol_inferior: (m, o, accion) => {
    if (!mismaFinca(m, o)) return false;
    if (accion === "read") return true;
    const rangoPropio = RANGO_FINCA[m.rol];
    const rangoObjetivo = o.rolObjetivo ? RANGO_FINCA[o.rolObjetivo] : undefined;
    return rangoPropio !== undefined && rangoObjetivo !== undefined && rangoObjetivo > rangoPropio;
  },

  // INVESTOR: únicamente el cultivo que financia (misma organización + id en su lista).
  cultivo_financiado: (m, o) =>
    mismaOrg(m, o) && o.cultivoId !== undefined && (m.cultivosFinanciados ?? []).includes(o.cultivoId),

  // BUYER: solo a través de un enlace compartido vigente, sobre un cultivo concreto.
  // (En la práctica un comprador no tiene User: el enforcement real vive en
  // EnlaceCompartido / /portal/[token]; esto deja la matriz completa y testeable.)
  via_enlace_compartido: (_m, o) => o.viaEnlaceCompartido === true && o.cultivoId !== undefined,
};

function membresiaPermite(m: MembresiaContexto, recurso: Recurso, accion: Accion, o: ObjetivoAutorizacion): boolean {
  if (m.estado !== "ACTIVA") return false;
  // Comodín de plataforma (ADR: `SUPER_ADMIN: ['*']`), incluso para recursos
  // que se agreguen después a la matriz.
  if (m.rol === "SUPER_ADMIN") return true;

  const celda = MATRIZ[recurso]?.[m.rol];
  if (!celda) return false; // recurso desconocido → denegar
  const { acciones, condicion } = detalleCelda(celda);
  if (!acciones.includes(accion)) return false;

  return condicion ? CONDICIONES[condicion](m, o, accion) : alcanceBase(m, o);
}

/**
 * ¿Puede alguna de las membresías (todas del mismo usuario) hacer `permiso`
 * sobre `objetivo`? Ej.: `can(membresias, "lote:update", { organizacionId, fincaId })`.
 */
export function can(
  membresias: readonly MembresiaContexto[],
  permiso: Permiso,
  objetivo: ObjetivoAutorizacion = {},
): boolean {
  const [recurso, accion] = permiso.split(":") as [Recurso, Accion];
  return membresias.some((m) => membresiaPermite(m, recurso, accion, objetivo));
}

export function cannot(
  membresias: readonly MembresiaContexto[],
  permiso: Permiso,
  objetivo: ObjetivoAutorizacion = {},
): boolean {
  return !can(membresias, permiso, objetivo);
}

// ─── Puente desde el modelo actual ─────────────────────────────────────────────

/**
 * Equivalente ADR-011 de un `Membresia.rol` (RolOrganizacion) actual. Lo usa el
 * backfill del Sprint 1 para llenar `Membresia.rolIam`. El ADR NO trae esta
 * tabla de equivalencias; sale de comparar las dos matrices:
 *
 *  - OWNER → ORG_OWNER. Y en una org INDIVIDUAL además FARM_OWNER: hoy el dueño
 *    tiene control total dentro de su organización, pero ORG_OWNER solo *lee*
 *    "Actividad de campo" — sin el FARM_OWNER extra, los dueños actuales
 *    perderían funciones. (En COOPERATIVA/GREMIO/etc. el dueño es gerencial y
 *    no opera fincas: solo ORG_OWNER.)
 *  - ADMIN_FINCA → FARM_ADMIN, NO ORG_ADMIN: el actual está atado a fincas
 *    concretas vía FincaAcceso, no a toda la organización.
 *  - COLABORADOR → FARM_COLLABORATOR · INVERSIONISTA → INVESTOR · COMPRADOR → BUYER.
 */
export function rolLegacyARolIam(rol: RolOrganizacion, tipoOrg: TipoOrg = "INDIVIDUAL"): Rol[] {
  switch (rol) {
    case "OWNER":
      return tipoOrg === "INDIVIDUAL" ? ["ORG_OWNER", "FARM_OWNER"] : ["ORG_OWNER"];
    case "ADMIN_FINCA":
      return ["FARM_ADMIN"];
    case "COLABORADOR":
      return ["FARM_COLLABORATOR"];
    case "INVERSIONISTA":
      return ["INVESTOR"];
    case "COMPRADOR":
      return ["BUYER"];
  }
}

/** `User.esSuperAdmin` (flag actual) → SUPER_ADMIN (membresía en la org CRECIAGRO_INTERNAL). */
export function rolesPlataformaDeUsuario(usuario: { esSuperAdmin: boolean }): Rol[] {
  return usuario.esSuperAdmin ? ["SUPER_ADMIN"] : [];
}
