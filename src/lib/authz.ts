/**
 * Autorización centralizada (RBAC) — Fase 0/2 del roadmap multi-tenant.
 * Ver CLAUDE.md §2.3 y docs/REQUERIMIENTOS.md §6 (matriz de roles) y ADR-004.
 *
 * Estado: skeleton funcional, aún NO exigido en las rutas existentes (Fase 0).
 * La migración de cada API route del chequeo ad hoc actual
 * (`where: { finca: { userId: session.user.id } }`) a `requireAccess()` es
 * trabajo de Fase 2 — se hace ruta por ruta, no de una vez, para no arriesgar
 * producción. `requireAccess()` es un complemento al `where` de scoping, no un
 * reemplazo: el helper decide *si puede*, el query sigue filtrando *qué ve*.
 *
 * Roles INVERSIONISTA/COMPRADOR quedan con casos parciales — sus modelos de
 * dominio (`InversionCultivo`, `EnlaceCompartido`) son de Fase 3/4 y aún no
 * existen en el schema; hoy solo pueden autorizarse como miembros de solo
 * lectura de una finca, no scoped a un cultivo específico como es el objetivo.
 */
import type { RolFinca, RolOrganizacion } from "@prisma/client";
import { db } from "./db";

export type Recurso =
  | "organizacion"
  | "membresia"
  | "finca"
  | "lote"
  | "cultivo"
  | "registroCultivo"
  | "gasto"
  | "ingreso"
  | "presupuesto"
  | "jornal"
  | "alerta"
  | "comprador"
  | "fichaTecnica";

export type Accion = "create" | "read" | "update" | "delete";

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
 */
const MATRIZ_ORGANIZACION: Record<Exclude<RolOrganizacion, "OWNER">, Partial<Record<Recurso, Accion[]>>> = {
  ADMIN_FINCA: {
    organizacion: ["read"],
    membresia: ["read"],
    finca: ["read", "update"],
    lote: ["create", "read", "update", "delete"],
    cultivo: ["create", "read", "update", "delete"],
    registroCultivo: ["create", "read", "update", "delete"],
    gasto: ["create", "read", "update", "delete"],
    ingreso: ["create", "read", "update", "delete"],
    presupuesto: ["create", "read", "update", "delete"],
    jornal: ["create", "read", "update", "delete"],
    alerta: ["create", "read", "update", "delete"],
    comprador: ["create", "read", "update", "delete"],
    fichaTecnica: ["read"],
  },
  COLABORADOR: {
    finca: ["read"],
    lote: ["read", "update"],
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
    select: { rol: true, aceptada: true, activa: true },
  });

  if (!membresia?.aceptada) {
    throw new AuthzError("No perteneces a la organización de este recurso");
  }
  if (!membresia.activa) {
    throw new AuthzError("Tu acceso a esta organización fue desactivado por el dueño");
  }

  if (membresia.rol === "OWNER") return; // acceso total dentro de su organización

  const permitido = MATRIZ_ORGANIZACION[membresia.rol]?.[recurso]?.includes(accion) ?? false;
  if (!permitido) {
    throw new AuthzError(`Rol ${membresia.rol} no autorizado para ${accion} sobre ${recurso}`);
  }

  // ADMIN_FINCA/COLABORADOR además deben tener FincaAcceso explícito a la
  // finca concreta cuando el contexto la identifica (scoping fino, §2.1).
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
