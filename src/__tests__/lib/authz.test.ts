import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * ADR-011 Sprint 2 — tests de aislamiento cross-tenant para `requireAccess()`
 * (pendiente que `CLAUDE.md §7` marca como obligatorio). Primer uso de
 * `vi.mock("@/lib/db", ...)` en el repo: `requireAccess()` importa un
 * singleton de Prisma directo (no inyectable), y no hay infraestructura de
 * base de datos de prueba en el proyecto — mockear `db` es la forma de menor
 * fricción de probarlo sin tocar Postgres, consistente con que el resto de
 * la suite (147 tests antes de este archivo) es 100% pura, sin I/O. La
 * lógica de DECISIÓN (`can()`/`MATRIZ`) ya tiene su propia cobertura
 * exhaustiva en authz-permissions.test.ts y authz-equivalencia-legacy.test.ts
 * — estos tests solo cubren el "pegamento" de `requireAccess()`: que
 * resuelve bien la organización del objetivo, que rechaza cuando el llamante
 * no pertenece a ella, y que el chequeo de FincaAcceso sigue aplicando.
 */

const dbMock = {
  user: { findUnique: vi.fn() },
  finca: { findUnique: vi.fn() },
  cultivo: { findUnique: vi.fn() },
  membresia: { findUnique: vi.fn() },
  fincaAcceso: { findUnique: vi.fn() },
};

vi.mock("@/lib/db", () => ({ db: dbMock }));

const { requireAccess, AuthzError } = await import("@/lib/authz");

const ORG_A = "org-a";
const ORG_B = "org-b";
const FINCA_A1 = "finca-a1";
const FINCA_A2 = "finca-a2";
const FINCA_B1 = "finca-b1";
const USER = "user-1";
const SESSION = { user: { id: USER } };

async function esperarAuthzError(promesa: Promise<void>): Promise<InstanceType<typeof AuthzError>> {
  try {
    await promesa;
  } catch (error) {
    expect(error).toBeInstanceOf(AuthzError);
    return error as InstanceType<typeof AuthzError>;
  }
  throw new Error("Se esperaba que requireAccess() lanzara AuthzError, pero no lanzó nada.");
}

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.user.findUnique.mockResolvedValue({ esSuperAdmin: false });
});

describe("requireAccess() — aislamiento cross-tenant", () => {
  it("deniega cuando el recurso (por fincaId) pertenece a OTRA organización que la del llamante", async () => {
    // El llamante SÍ es COLABORADOR con permisos amplios — pero en la org A.
    // El fincaId del ctx resuelve a la org B, así que el lookup de Membresia
    // (userId, org B) no encuentra nada.
    dbMock.finca.findUnique.mockResolvedValue({ organizacionId: ORG_B });
    dbMock.membresia.findUnique.mockResolvedValue(null);

    const error = await esperarAuthzError(requireAccess(SESSION, "lote", "read", { fincaId: FINCA_B1 }));
    expect(error.message).toMatch(/no perteneces a la organización/i);
    expect(dbMock.membresia.findUnique).toHaveBeenCalledWith({
      where: { userId_organizacionId: { userId: USER, organizacionId: ORG_B } },
      select: { rol: true, aceptada: true, activa: true },
    });
  });

  it("deniega cuando el recurso (por cultivoId) pertenece a OTRA organización", async () => {
    dbMock.cultivo.findUnique.mockResolvedValue({ lote: { finca: { organizacionId: ORG_B } } });
    dbMock.membresia.findUnique.mockResolvedValue(null);

    await esperarAuthzError(requireAccess(SESSION, "cultivo", "read", { cultivoId: "cultivo-de-org-b" }));
  });

  it("permite cuando el recurso SÍ pertenece a la organización del llamante (control positivo)", async () => {
    dbMock.finca.findUnique.mockResolvedValue({ organizacionId: ORG_A });
    dbMock.membresia.findUnique.mockResolvedValue({ rol: "ADMIN_FINCA", aceptada: true, activa: true });
    dbMock.fincaAcceso.findUnique.mockResolvedValue({ rol: "ADMIN" });

    await expect(requireAccess(SESSION, "lote", "read", { fincaId: FINCA_A1 })).resolves.toBeUndefined();
  });

  it("ADMIN_FINCA con FincaAcceso solo a la finca X queda denegado sobre la finca Y de su MISMA organización", async () => {
    // can() ya autoriza (ADMIN_FINCA→FARM_ADMIN tiene CRUD sobre lote) — lo
    // que debe bloquear es el chequeo de FincaAcceso, capa que este sprint
    // no toca.
    dbMock.finca.findUnique.mockResolvedValue({ organizacionId: ORG_A });
    dbMock.membresia.findUnique.mockResolvedValue({ rol: "ADMIN_FINCA", aceptada: true, activa: true });
    dbMock.fincaAcceso.findUnique.mockResolvedValue(null); // sin acceso a FINCA_A2

    const error = await esperarAuthzError(requireAccess(SESSION, "lote", "read", { fincaId: FINCA_A2 }));
    expect(error.message).toMatch(/no tienes acceso concedido a esta finca/i);
  });

  it("SUPER_ADMIN pasa cualquier recurso/organización sin consultar Membresia", async () => {
    dbMock.user.findUnique.mockResolvedValue({ esSuperAdmin: true });

    await expect(requireAccess(SESSION, "gasto", "delete", { fincaId: FINCA_B1 })).resolves.toBeUndefined();
    expect(dbMock.membresia.findUnique).not.toHaveBeenCalled();
  });

  it("deniega cuando la membresía está SUSPENDIDA (activa: false)", async () => {
    dbMock.finca.findUnique.mockResolvedValue({ organizacionId: ORG_A });
    dbMock.membresia.findUnique.mockResolvedValue({ rol: "COLABORADOR", aceptada: true, activa: false });

    const error = await esperarAuthzError(requireAccess(SESSION, "gasto", "read", { fincaId: FINCA_A1 }));
    expect(error.message).toMatch(/desactivado por el dueño/i);
  });

  it("deniega cuando la membresía está PENDIENTE_INVITACION (aceptada: false)", async () => {
    dbMock.finca.findUnique.mockResolvedValue({ organizacionId: ORG_A });
    dbMock.membresia.findUnique.mockResolvedValue({ rol: "COLABORADOR", aceptada: false, activa: true });

    const error = await esperarAuthzError(requireAccess(SESSION, "gasto", "read", { fincaId: FINCA_A1 }));
    expect(error.message).toMatch(/no perteneces a la organización/i);
  });

  it("deniega sin sesión (401, no 403)", async () => {
    const error = await esperarAuthzError(requireAccess(null, "lote", "read", { fincaId: FINCA_A1 }));
    expect(error.status).toBe(401);
  });

  it("COLABORADOR (FARM_COLLABORATOR) no puede borrar un lote aunque sea de su propia organización — el rol no alcanza", async () => {
    dbMock.finca.findUnique.mockResolvedValue({ organizacionId: ORG_A });
    dbMock.membresia.findUnique.mockResolvedValue({ rol: "COLABORADOR", aceptada: true, activa: true });

    await esperarAuthzError(requireAccess(SESSION, "lote", "delete", { fincaId: FINCA_A1 }));
  });
});

describe("requireAccess() — una persona en DOS organizaciones (multi-organización)", () => {
  // Dueña de la organización A y solo colaboradora en la B: cada `ctx` se
  // autoriza contra SU organización — el rol de una nunca se filtra a la otra.
  function membresiaPorOrg({ where }: { where: { userId_organizacionId: { organizacionId: string } } }) {
    const org = where.userId_organizacionId.organizacionId;
    if (org === ORG_A) return Promise.resolve({ rol: "OWNER", aceptada: true, activa: true });
    if (org === ORG_B) return Promise.resolve({ rol: "COLABORADOR", aceptada: true, activa: true });
    return Promise.resolve(null);
  }

  it("como OWNER de A puede borrar en A, pero el mismo usuario NO puede borrar en B donde es solo colaborador", async () => {
    dbMock.membresia.findUnique.mockImplementation(membresiaPorOrg);

    dbMock.finca.findUnique.mockResolvedValue({ organizacionId: ORG_A });
    await expect(requireAccess(SESSION, "lote", "delete", { fincaId: FINCA_A1 })).resolves.toBeUndefined();

    dbMock.finca.findUnique.mockResolvedValue({ organizacionId: ORG_B });
    dbMock.fincaAcceso.findUnique.mockResolvedValue({ rol: "OPERARIO" });
    await esperarAuthzError(requireAccess(SESSION, "lote", "delete", { fincaId: FINCA_B1 }));
  });

  it("una organización ajena a ambas (C) sigue denegada", async () => {
    dbMock.membresia.findUnique.mockImplementation(membresiaPorOrg);
    dbMock.finca.findUnique.mockResolvedValue({ organizacionId: "org-c" });

    await esperarAuthzError(requireAccess(SESSION, "lote", "read", { fincaId: "finca-c1" }));
  });
});
