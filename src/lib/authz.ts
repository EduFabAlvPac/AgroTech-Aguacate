/**
 * Autorización centralizada (RBAC) — Fase 0/2 del roadmap multi-tenant.
 * Ver CLAUDE.md §2.3 y docs/REQUERIMIENTOS.md §6 (matriz de roles) y ADR-004.
 *
 * ADR-011 Sprint 2: `requireAccess()` decide ahora con `can()` (evaluador puro
 * de `src/lib/authz/policies.ts`) sobre la matriz extendida de
 * `src/lib/authz/permissions.ts`, en vez de indexar a mano
 * `MATRIZ_ORGANIZACION` (conservada abajo, sin usar, como referencia de
 * equivalencia — ver su comentario). La firma pública de `requireAccess()` NO
 * cambió: los 55 call sites existentes (`grep -rn "requireAccess(" src/app/`)
 * siguen funcionando exactamente igual, sin tocarlos.
 *
 * `requireAccess()` es un complemento al `where` de scoping de cada query, no
 * un reemplazo: el helper decide *si puede*, el query sigue filtrando *qué
 * ve*.
 *
 * Roles INVERSIONISTA/COMPRADOR quedan con casos parciales en esta capa — su
 * activación completa vía `can()` (con `InversionCultivo`/`EnlaceCompartido`
 * como scope real) es un sprint aparte (`CLAUDE.md §7`: tests de aislamiento
 * cross-tenant obligatorios antes de habilitarlos en producción).
 */
import type { RolFinca, RolOrganizacion } from "@prisma/client";
import { db } from "./db";
import { can, rolLegacyARolIam, type MembresiaContexto } from "./authz/policies";
import type { Recurso, Accion, Permiso } from "./authz/permissions";
import { motivoBloqueoEscritura } from "./plan-guard";

export type { Recurso, Accion };

export interface AuthzContext {
  organizacionId?: string;
  fincaId?: string;
  cultivoId?: string;
}

export interface AuthzSession {
  user: { id: string };
}

export class AuthzError extends Error {
  status: 401 | 403;
  constructor(message: string, status: 401 | 403 = 403) {
    super(message);
    this.name = "AuthzError";
    this.status = status;
  }
}

/**
 * Matriz de permisos rol-de-organización × recurso × acción, resumen operativo
 * de la tabla completa en docs/REQUERIMIENTOS.md §6.1. OWNER tiene acceso total
 * dentro de su organización por diseño (no se tabula explícitamente).
 *
 * ADR-011 Sprint 2: esta matriz YA NO es la fuente de verdad en tiempo de
 * ejecución — `requireAccess()` decide con `can()`/`MATRIZ` de
 * `src/lib/authz/permissions.ts` (que extiende la matriz del ADR con estos
 * mismos recursos, ver comentario del tipo `Recurso` ahí). Se conserva
 * exportada, sin usar en la lógica, como la referencia contra la que
 * `src/__tests__/lib/authz-equivalencia-legacy.test.ts` prueba que el swap no
 * cambió el comportamiento de ningún rol real — mismo criterio de
 * "nunca borrar, dejar documentado como superado" ya aplicado a `rolIam` y a
 * los valores viejos de `PlanOrganizacion`.
 */
export const MATRIZ_ORGANIZACION: Record<Exclude<RolOrganizacion, "OWNER">, Partial<Record<Recurso, Accion[]>>> = {
  ADMIN_FINCA: {
    organizacion: ["read"],
    membresia: ["read"],
    finca: ["read", "update"],
    lote: ["create", "read", "update", "delete"],
    analisisSuelo: ["create", "read", "update", "delete"],
    cultivo: ["create", "read", "update", "delete"],
    registroCultivo: ["create", "read", "update", "delete"],
    gasto: ["create", "read", "update", "delete"],
    ingreso: ["create", "read", "update", "delete"],
    presupuesto: ["create", "read", "update", "delete"],
    jornal: ["create", "read", "update", "delete"],
    alerta: ["create", "read", "update", "delete"],
    comprador: ["create", "read", "update", "delete"],
    fichaTecnica: ["read"],
    enlaceCompartido: ["create", "read", "update", "delete"],
  },
  COLABORADOR: {
    finca: ["read"],
    lote: ["read", "update"],
    analisisSuelo: ["create", "read", "update"],
    cultivo: ["read", "update"],
    registroCultivo: ["create", "read", "update"],
    gasto: ["create", "read"],
    ingreso: ["create", "read"],
    jornal: ["create", "read"],
    alerta: ["read", "update"],
    comprador: ["read"],
    fichaTecnica: ["read"],
  },
  // Solo lectura scoped a lo que financia (InversionCultivo, Fase 3) — hasta
  // entonces no se le concede acceso a recursos de finca por este helper.
  INVERSIONISTA: {
    fichaTecnica: ["read"],
  },
  // Sin membresía por defecto en el modelo objetivo (acceso vía EnlaceCompartido,
  // Fase 4); si llegara a tener Membresia igual no se le abre nada por acá.
  COMPRADOR: {},
};

/** Acciones que un FincaAcceso.rol adicional puede restringir para no-OWNER. */
const MATRIZ_FINCA: Record<RolFinca, Accion[]> = {
  ADMIN: ["create", "read", "update", "delete"],
  OPERARIO: ["create", "read", "update"],
  LECTURA: ["read"],
};

async function esSuperAdmin(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { esSuperAdmin: true } });
  return user?.esSuperAdmin ?? false;
}

/**
 * Guarda de acceso para el panel de administración (gestión del catálogo de
 * fichas técnicas, etc.) — recurso exclusivo de Super Admin, sin scoping de
 * organización. Se consulta la BD (no solo la sesión/JWT) para que revocar
 * `esSuperAdmin` surta efecto sin esperar a que expire el JWT.
 */
export async function requireSuperAdmin(session: AuthzSession | null | undefined): Promise<void> {
  if (!session?.user?.id) throw new AuthzError("No autenticado", 401);
  if (!(await esSuperAdmin(session.user.id))) {
    throw new AuthzError("Solo Super Admin puede acceder a este recurso");
  }
}

/** Resuelve el organizacionId efectivo a partir del contexto de la operación. */
async function resolverOrganizacionId(ctx: AuthzContext): Promise<string | null> {
  if (ctx.organizacionId) return ctx.organizacionId;

  if (ctx.fincaId) {
    const finca = await db.finca.findUnique({ where: { id: ctx.fincaId }, select: { organizacionId: true } });
    return finca?.organizacionId ?? null;
  }

  if (ctx.cultivoId) {
    const cultivo = await db.cultivo.findUnique({
      where: { id: ctx.cultivoId },
      select: { lote: { select: { finca: { select: { organizacionId: true } } } } },
    });
    return cultivo?.lote.finca.organizacionId ?? null;
  }

  return null;
}

/**
 * Verifica si `session.user` puede ejecutar `accion` sobre `recurso` en el
 * contexto dado. Lanza `AuthzError` si no está autorizado — no retorna un
 * booleano a propósito, para que el caller no pueda "olvidar" el chequeo.
 *
 * ADR-011 Sprint 2: de acá para abajo (tras el early-return de OWNER) la
 * decisión la toma `can()` sobre la matriz extendida de `permissions.ts`, no
 * un lookup manual en `MATRIZ_ORGANIZACION`. Dos atajos deliberados, ambos
 * verificados contra la matriz vieja con
 * `src/__tests__/lib/authz-equivalencia-legacy.test.ts`:
 *  - OWNER sigue resolviéndose ANTES de tocar `can()` (bypass total, sin
 *    cambios) — no por desconfianza en la matriz nueva, sino porque OWNER es
 *    el único rol legacy que se traduce a DOS roles IAM (`rolLegacyARolIam`
 *    → `[ORG_OWNER, FARM_OWNER]` en una org individual) y mover ese caso a
 *    `can()` obligaría a resolver `Organizacion.tipo` en cada llamada sin
 *    necesidad real: como OWNER nunca llega a este punto, ese costo se evita.
 *  - Por lo mismo, `rolLegacyARolIam()` se llama sin `tipoOrg` (default
 *    "INDIVIDUAL"): el único caso que ese parámetro afecta es justamente el
 *    de OWNER, que ya salió por el atajo de arriba.
 */
export async function requireAccess(
  session: AuthzSession | null | undefined,
  recurso: Recurso,
  accion: Accion,
  ctx: AuthzContext = {}
): Promise<void> {
  if (!session?.user?.id) throw new AuthzError("No autenticado", 401);
  const userId = session.user.id;

  if (await esSuperAdmin(userId)) return;

  const organizacionId = await resolverOrganizacionId(ctx);
  if (!organizacionId) {
    // Recurso sin organización asignada aún (dato pre-backfill) o contexto
    // insuficiente — se niega por defecto en vez de asumir acceso.
    throw new AuthzError(`No se pudo determinar la organización para autorizar "${recurso}"`);
  }

  const membresia = await db.membresia.findUnique({
    where: { userId_organizacionId: { userId, organizacionId } },
    select: { rol: true, aceptada: true, activa: true, organizacion: { select: { eliminadoEn: true } } },
  });

  // Organización eliminada por el Super Admin (soft-delete): ya nadie de ella
  // opera. El Super Admin sale antes de llegar acá.
  if (membresia?.organizacion?.eliminadoEn) {
    throw new AuthzError("Esta organización fue eliminada");
  }

  if (!membresia?.aceptada) {
    throw new AuthzError("No perteneces a la organización de este recurso");
  }
  if (!membresia.activa) {
    throw new AuthzError("Tu acceso a esta organización fue desactivado por el dueño");
  }

  // Modo lectura (trial vencido / plan suspendido): las escrituras se bloquean
  // para TODOS los roles de la organización, dueño incluido. Los GET pasan.
  // Super Admin ya salió más arriba.
  if (accion !== "read") {
    const bloqueo = await motivoBloqueoEscritura(organizacionId);
    if (bloqueo) throw new AuthzError(bloqueo);
  }

  if (membresia.rol === "OWNER") return; // acceso total dentro de su organización

  // `Membresia.rolesIam`/`estado` (columnas "sombra" del Sprint 1) NO se leen
  // acá a propósito: Equipo (`editarMiembro`/`toggleActivaMiembro`) cambia
  // `rol`/`activa` en vivo pero todavía no las mantiene sincronizadas (el
  // cutover real es de un sprint posterior — ver comentario del schema en
  // `Membresia`). Se recalculan en el momento desde `rol`/`aceptada`/`activa`,
  // que SÍ son la fuente de verdad hoy — igual que hace el backfill, pero
  // fresco en cada llamada en vez de confiar en una copia que puede quedar
  // vieja.
  const rolesIam = rolLegacyARolIam(membresia.rol);

  // `Membresia.fincaId` tampoco se puebla todavía (Sprint 3) — para los
  // roles FARM_*, se usa el `fincaId` del propio `ctx` de esta llamada como
  // scope de la membresía: el límite real entre fincas de una misma
  // organización lo sigue imponiendo el chequeo de FincaAcceso de abajo, sin
  // cambios — ni más ni menos de lo que ya hacía `MATRIZ_ORGANIZACION`, que
  // tampoco distinguía fincas (solo rol×recurso×acción).
  const membresias: MembresiaContexto[] = rolesIam.map((rol) => ({
    rol,
    organizacionId,
    fincaId: ctx.fincaId,
    estado: "ACTIVA",
  }));

  const permiso = `${recurso}:${accion}` as Permiso;
  const permitido = can(membresias, permiso, {
    organizacionId,
    fincaId: ctx.fincaId,
    cultivoId: ctx.cultivoId,
  });
  if (!permitido) {
    throw new AuthzError(`Rol ${membresia.rol} no autorizado para ${accion} sobre ${recurso}`);
  }

  // ADMIN_FINCA/COLABORADOR además deben tener FincaAcceso explícito a la
  // finca concreta cuando el contexto la identifica (scoping fino, §2.1) —
  // capa ortogonal que el ADR todavía no cubre; sin cambios.
  if (ctx.fincaId && (membresia.rol === "ADMIN_FINCA" || membresia.rol === "COLABORADOR")) {
    const acceso = await db.fincaAcceso.findUnique({
      where: { userId_fincaId: { userId, fincaId: ctx.fincaId } },
      select: { rol: true },
    });
    if (!acceso || !MATRIZ_FINCA[acceso.rol].includes(accion)) {
      throw new AuthzError("No tienes acceso concedido a esta finca");
    }
  }
}

/**
 * ¿Puede esta sesión hacer `accion` sobre `recurso` en esa finca? Para decidir
 * qué botones mostrar (no reemplaza a `requireAccess` al ejecutar). Incluye el
 * modo solo lectura de una organización con prueba vencida o suspendida.
 */
export async function puedeEnFinca(session: AuthzSession | null | undefined, recurso: Recurso, accion: Accion, fincaId: string): Promise<boolean> {
  try {
    await requireAccess(session, recurso, accion, { fincaId });
    return true;
  } catch (error) {
    if (error instanceof AuthzError) return false;
    throw error;
  }
}
