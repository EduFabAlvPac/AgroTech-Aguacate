/**
 * Catálogo de permisos del ADR-011 (capas 4-5 del IAM: Rol → Permiso).
 * Transcripción de la matriz §4 de docs/ADR-011-Modelo-Identidad-Roles-Permisos.md
 * — definida en CÓDIGO, no en base de datos (decisión del ADR: type-safety,
 * auditable por diff en Git, sin superficie de ataque SQL).
 *
 * ESTADO: catálogo puro, todavía NO enchufado a ninguna ruta. El RBAC que
 * realmente manda hoy sigue siendo src/lib/authz.ts (`requireAccess`, con
 * `RolOrganizacion`). El Sprint 2 del ADR hace que `requireAccess` se apoye en
 * esta matriz; mientras tanto, este archivo se puede evolucionar y testear sin
 * riesgo para producción. Ver docs/ADR-011-notas-de-implementacion.md.
 *
 * INTERPRETACIONES (el ADR es ambiguo en estos puntos — confirmar al firmarlo):
 * 1. La matriz del ADR no trae columna PLATFORM_SUPPORT, aunque §2.2 lo define
 *    ("lectura + impersonación con consentimiento") y §7 dice "sin acceso
 *    persistente" (A.8.2). Se adoptó la lectura MÁS RESTRICTIVA: metadatos
 *    operativos no financieros + solicitar impersonación. Nada de finanzas,
 *    facturación ni inversionistas, y ningún update/delete.
 * 2. El `*` de la matriz no se define en ningún lado. Se interpretó como
 *    "permiso condicionado al scope" y cada caso es una `NombreCondicion`
 *    explícita (ver CONDICIONES en policies.ts). Donde el `*` solo significa
 *    "dentro de su propia finca" (Audit log de FARM_OWNER/FARM_ADMIN), lo
 *    cubre la regla base de scope y no hace falta condición aparte.
 * 3. "Impersonar usuario" figura solo para SUPER_ADMIN en la matriz, pero §6.5
 *    lo inicia PLATFORM_SUPPORT → SUPPORT puede `create` (solicitar) y `read`.
 *    Es una de las 3 decisiones que exigen firma; nada lo activa todavía.
 */
import type { Rol } from "@prisma/client";

export type Accion = "create" | "read" | "update" | "delete";

/**
 * Filas de la matriz §4 del ADR, en camelCase español como src/lib/authz.ts,
 * MÁS los recursos que hoy solo existen en `src/lib/authz.ts::MATRIZ_ORGANIZACION`
 * y no tienen equivalente 1:1 en la matriz §4 del ADR (Sprint 2 de ADR-011 —
 * ver docs/ADR-011-notas-de-implementacion.md §3 "MATRIZ extendida").
 *
 * Se agregan como filas propias, NO se fuerzan a encajar en categorías del
 * ADR que ya existen (ej. `gasto`/`ingreso` → `finanzasEditar`): mapearlos
 * así habría cambiado comportamiento real (`finanzasEditar` para
 * FARM_COLLABORATOR es NADA en el ADR, pero hoy COLABORADOR SÍ puede crear/
 * leer gasto/ingreso) — una regresión silenciosa para colaboradores reales
 * en producción. Añadidos: `registroCultivo`, `membresia`, `analisisSuelo`,
 * `gasto`, `ingreso`, `presupuesto`, `jornal`, `alerta`, `comprador` (el
 * contacto CRM — distinto de `compradorLink`, que es el acceso vía
 * EnlaceCompartido), `fichaTecnica`, `enlaceCompartido`.
 */
export type Recurso =
  | "organizacion"
  | "facturacion" // Billing / Plan
  | "invitarUsuario" // User invite
  | "finca" // Farm
  | "lote"
  | "cultivo"
  | "actividadCampo"
  | "finanzasVer"
  | "finanzasEditar"
  | "diagnosticoIA"
  | "inversionista"
  | "compradorLink" // Comprador (link)
  | "reportesOrg" // Reportes agregados de la organización
  | "auditLog"
  | "impersonarUsuario"
  // ─── Extensión Sprint 2 (recursos legacy sin fila en el ADR) ───────────────
  | "registroCultivo"
  | "membresia"
  | "analisisSuelo"
  | "gasto"
  | "ingreso"
  | "presupuesto"
  | "jornal"
  | "alerta"
  | "comprador"
  | "fichaTecnica"
  | "enlaceCompartido"
  // Seguros agrícolas: la póliza (dato financiero, solo gestión) y el siniestro
  // (un colaborador de campo debe poder REPORTARLO, no editar la póliza).
  | "seguro"
  | "siniestro";

/** Código de permiso, ej. "lote:update" (mismo formato que el ejemplo del ADR). */
export type Permiso = `${Recurso}:${Accion}`;

/**
 * Los `*` de la matriz, uno por caso. Se evalúan en policies.ts (CONDICIONES).
 */
export type NombreCondicion =
  | "org_individual" // FARM_OWNER sobre facturación: solo si la org es INDIVIDUAL (él es quien paga)
  | "invitar_rol_inferior" // FARM_OWNER/FARM_ADMIN: solo invitar a roles de rango inferior en su finca
  | "cultivo_financiado" // INVESTOR: solo los cultivos que financia
  | "via_enlace_compartido"; // BUYER: solo a través de un enlace compartido vigente

export type Celda =
  | readonly Accion[]
  | { readonly acciones: readonly Accion[]; readonly condicion: NombreCondicion };

// Un `Record<Rol, true>` obliga al compilador a avisar si se agrega un rol al
// enum de Prisma sin actualizar este archivo (y de paso da la lista en runtime).
const ROLES_REGISTRO: Record<Rol, true> = {
  SUPER_ADMIN: true,
  PLATFORM_SUPPORT: true,
  ORG_OWNER: true,
  ORG_ADMIN: true,
  FARM_OWNER: true,
  FARM_ADMIN: true,
  FARM_COLLABORATOR: true,
  INVESTOR: true,
  BUYER: true,
};
export const ROLES = Object.keys(ROLES_REGISTRO) as Rol[];

export const ACCIONES: readonly Accion[] = ["create", "read", "update", "delete"];

const CRUD: readonly Accion[] = ["create", "read", "update", "delete"];
const CRU: readonly Accion[] = ["create", "read", "update"];
const CR: readonly Accion[] = ["create", "read"];
const RU: readonly Accion[] = ["read", "update"];
const R: readonly Accion[] = ["read"];
const NADA: readonly Accion[] = [];

/**
 * Matriz rol × recurso × acciones (ADR-011 §4). Leyenda del ADR: C=create,
 * R=read, U=update, D=delete, —=NADA. Columna por columna en el orden del ADR:
 * SUPER_ADMIN, [PLATFORM_SUPPORT: ver interpretación 1], ORG_OWNER, ORG_ADMIN,
 * FARM_OWNER, FARM_ADMIN, FARM_COLLABORATOR, INVESTOR, BUYER.
 *
 * Ojo, hallazgo de la revisión: ORG_OWNER solo tiene *lectura* de "Actividad de
 * campo". Un dueño actual (RolOrganizacion.OWNER) de una org INDIVIDUAL hoy
 * puede registrar actividades; por eso rolLegacyARolIam() le suma FARM_OWNER.
 */
export const MATRIZ: Record<Recurso, Record<Rol, Celda>> = {
  organizacion: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: R, ORG_OWNER: RU, ORG_ADMIN: R,
    FARM_OWNER: NADA, FARM_ADMIN: NADA, FARM_COLLABORATOR: NADA, INVESTOR: NADA, BUYER: NADA,
  },
  facturacion: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: R,
    FARM_OWNER: { acciones: CRUD, condicion: "org_individual" },
    FARM_ADMIN: NADA, FARM_COLLABORATOR: NADA, INVESTOR: NADA, BUYER: NADA,
  },
  invitarUsuario: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: CRU,
    FARM_OWNER: { acciones: CRU, condicion: "invitar_rol_inferior" },
    FARM_ADMIN: { acciones: CRU, condicion: "invitar_rol_inferior" },
    FARM_COLLABORATOR: NADA, INVESTOR: NADA, BUYER: NADA,
  },
  finca: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: R, ORG_OWNER: CRUD, ORG_ADMIN: CRUD,
    FARM_OWNER: RU, FARM_ADMIN: RU, FARM_COLLABORATOR: R, INVESTOR: NADA, BUYER: NADA,
  },
  lote: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: R, ORG_OWNER: CRUD, ORG_ADMIN: CRUD,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: RU, INVESTOR: NADA, BUYER: NADA,
  },
  cultivo: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: R, ORG_OWNER: CRUD, ORG_ADMIN: CRUD,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: CRU,
    INVESTOR: { acciones: R, condicion: "cultivo_financiado" },
    BUYER: { acciones: R, condicion: "via_enlace_compartido" },
  },
  actividadCampo: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: R, ORG_ADMIN: R,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: CRU, INVESTOR: NADA, BUYER: NADA,
  },
  finanzasVer: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: R, ORG_ADMIN: R,
    FARM_OWNER: R, FARM_ADMIN: R, FARM_COLLABORATOR: NADA,
    INVESTOR: { acciones: R, condicion: "cultivo_financiado" },
    BUYER: NADA,
  },
  finanzasEditar: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: R,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: NADA, INVESTOR: NADA, BUYER: NADA,
  },
  diagnosticoIA: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: CRUD,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: CRUD, INVESTOR: NADA, BUYER: NADA,
  },
  inversionista: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: R,
    FARM_OWNER: CRU, FARM_ADMIN: NADA, FARM_COLLABORATOR: NADA, INVESTOR: NADA, BUYER: NADA,
  },
  compradorLink: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: CRUD,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: NADA, INVESTOR: NADA, BUYER: NADA,
  },
  reportesOrg: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: R, ORG_ADMIN: R,
    FARM_OWNER: NADA, FARM_ADMIN: NADA, FARM_COLLABORATOR: NADA, INVESTOR: NADA, BUYER: NADA,
  },
  auditLog: {
    // `R*` de FARM_OWNER/FARM_ADMIN = solo su finca: lo impone la regla base
    // de scope (policies.ts::alcanceBase), no hace falta una condición aparte.
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: R, ORG_OWNER: R, ORG_ADMIN: R,
    FARM_OWNER: R, FARM_ADMIN: R, FARM_COLLABORATOR: NADA, INVESTOR: NADA, BUYER: NADA,
  },
  impersonarUsuario: {
    // create = solicitar la impersonación; el consentimiento del usuario objetivo
    // y el límite de 2 h los impone el flujo del Sprint 7, no esta matriz.
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: ["create", "read"], ORG_OWNER: NADA, ORG_ADMIN: NADA,
    FARM_OWNER: NADA, FARM_ADMIN: NADA, FARM_COLLABORATOR: NADA, INVESTOR: NADA, BUYER: NADA,
  },

  // ─── Extensión Sprint 2 — recursos legacy (ver comentario en `Recurso`) ────
  // Portados 1:1 desde `MATRIZ_ORGANIZACION`/`MATRIZ_FINCA` de `src/lib/authz.ts`
  // (vía `rolLegacyARolIam`), no desde el documento del ADR (esas filas no
  // existen ahí). `ORG_ADMIN`/`PLATFORM_SUPPORT` quedan en NADA en las 11: hoy
  // ningún `RolOrganizacion` legacy mapea a esos roles IAM (nadie los tiene
  // todavía), así que no hay comportamiento real que preservar para ellos acá.
  registroCultivo: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: NADA,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: CRU, INVESTOR: NADA, BUYER: NADA,
  },
  // Sin call site real hoy (ver auditoría Sprint 2) — se porta igual, por si
  // algún día se enchufa "gestión de membresías" a `requireAccess`.
  membresia: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: R, ORG_ADMIN: NADA,
    FARM_OWNER: R, FARM_ADMIN: R, FARM_COLLABORATOR: NADA, INVESTOR: NADA, BUYER: NADA,
  },
  analisisSuelo: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: NADA,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: CRU, INVESTOR: NADA, BUYER: NADA,
  },
  gasto: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: NADA,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: CR, INVESTOR: NADA, BUYER: NADA,
  },
  ingreso: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: NADA,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: CR, INVESTOR: NADA, BUYER: NADA,
  },
  presupuesto: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: NADA,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: NADA, INVESTOR: NADA, BUYER: NADA,
  },
  jornal: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: NADA,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: CR, INVESTOR: NADA, BUYER: NADA,
  },
  alerta: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: NADA,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: RU, INVESTOR: NADA, BUYER: NADA,
  },
  // El contacto CRM (`db.comprador`) — distinto de `compradorLink` (el acceso
  // vía EnlaceCompartido).
  comprador: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: NADA,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: R, INVESTOR: NADA, BUYER: NADA,
  },
  // Sin call site real hoy (la gestión real de fichas maestras pasa por
  // `requireSuperAdmin()`, no por acá) — se porta igual que `membresia`, con
  // una excepción: legacy da a INVERSIONISTA lectura incondicional, pero el
  // catálogo exige que INVESTOR/BUYER SIEMPRE vayan condicionados (invariante
  // ya cubierto por un test, ver authz-permissions.test.ts) — como esta fila
  // no tiene ningún call site real, se deniega en vez de forzar una condición
  // que no aplica (fichaTecnica no es un recurso scoped a cultivo/finca).
  fichaTecnica: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: R, ORG_ADMIN: NADA,
    FARM_OWNER: R, FARM_ADMIN: R, FARM_COLLABORATOR: R, INVESTOR: NADA, BUYER: NADA,
  },
  enlaceCompartido: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: NADA,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: NADA, INVESTOR: NADA, BUYER: NADA,
  },
  seguro: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: NADA,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: R, INVESTOR: NADA, BUYER: NADA,
  },
  siniestro: {
    SUPER_ADMIN: CRUD, PLATFORM_SUPPORT: NADA, ORG_OWNER: CRUD, ORG_ADMIN: NADA,
    FARM_OWNER: CRUD, FARM_ADMIN: CRUD, FARM_COLLABORATOR: CR, INVESTOR: NADA, BUYER: NADA,
  },
};

export const RECURSOS = Object.keys(MATRIZ) as Recurso[];

/** Normaliza una celda a `{ acciones, condicion? }`. */
export function detalleCelda(celda: Celda): { acciones: readonly Accion[]; condicion?: NombreCondicion } {
  return Array.isArray(celda) ? { acciones: celda as readonly Accion[] } : (celda as { acciones: readonly Accion[]; condicion: NombreCondicion });
}

/**
 * Permisos de un rol (para el futuro hook `usePermission()` del Sprint 2: ocultar
 * botones sin permiso). Un permiso con `condicion` es "posible pero sujeto a
 * scope": la UI puede mostrarlo y dejar que el servidor decida con `can()`.
 */
export function permisosDeRol(rol: Rol): { permiso: Permiso; condicion?: NombreCondicion }[] {
  const resultado: { permiso: Permiso; condicion?: NombreCondicion }[] = [];
  for (const recurso of RECURSOS) {
    const { acciones, condicion } = detalleCelda(MATRIZ[recurso][rol]);
    for (const accion of acciones) {
      resultado.push({ permiso: `${recurso}:${accion}`, ...(condicion ? { condicion } : {}) });
    }
  }
  return resultado;
}
