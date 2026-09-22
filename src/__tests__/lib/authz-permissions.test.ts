import { describe, it, expect } from "vitest";
import type { EstadoMembresia, Rol, RolOrganizacion } from "@prisma/client";
import { ACCIONES, MATRIZ, RECURSOS, ROLES, permisosDeRol, detalleCelda, type Permiso } from "@/lib/authz/permissions";
import {
  can,
  cannot,
  rolLegacyARolIam,
  rolesPlataformaDeUsuario,
  type MembresiaContexto,
  type ObjetivoAutorizacion,
} from "@/lib/authz/policies";

// ADR-011 — catálogo de permisos en código. Estos tests fijan (1) invariantes
// que el ADR promete (deny by default, aislamiento por scope, mínimo privilegio
// de PLATFORM_SUPPORT) y (2) celdas concretas de la matriz §4, para que un
// cambio de permisos sea una decisión visible en el diff y no un accidente.

const ORG_A = "org-a";
const ORG_B = "org-b";
const FINCA_1 = "finca-1";
const FINCA_2 = "finca-2";

function membresia(rol: Rol, extra: Partial<MembresiaContexto> = {}): MembresiaContexto {
  return { rol, organizacionId: ORG_A, estado: "ACTIVA", ...extra };
}
const enFinca1 = (rol: Rol) => membresia(rol, { fincaId: FINCA_1 });
const objetivoFinca1: ObjetivoAutorizacion = { organizacionId: ORG_A, fincaId: FINCA_1 };

describe("catálogo — estructura", () => {
  it("cubre los 9 roles del ADR y los 26 recursos de la matriz (15 del ADR + 11 legacy, Sprint 2)", () => {
    expect(ROLES).toHaveLength(9);
    expect(RECURSOS).toHaveLength(26);
    for (const recurso of RECURSOS) {
      expect(Object.keys(MATRIZ[recurso]).sort()).toEqual([...ROLES].sort());
    }
  });

  it("solo usa acciones válidas", () => {
    for (const recurso of RECURSOS) {
      for (const rol of ROLES) {
        for (const accion of detalleCelda(MATRIZ[recurso][rol]).acciones) {
          expect(ACCIONES).toContain(accion);
        }
      }
    }
  });
});

describe("deny by default (ADR §7, A.8.3)", () => {
  it("sin membresías no se puede nada", () => {
    expect(can([], "lote:read", objetivoFinca1)).toBe(false);
    expect(cannot([], "lote:read", objetivoFinca1)).toBe(true);
  });

  it("un permiso desconocido (typo en runtime) se deniega, no revienta", () => {
    expect(can([enFinca1("FARM_OWNER")], "lotes:read" as Permiso, objetivoFinca1)).toBe(false);
  });

  it("una celda vacía (—) se deniega", () => {
    expect(can([enFinca1("FARM_COLLABORATOR")], "finanzasVer:read", objetivoFinca1)).toBe(false);
  });

  it.each<EstadoMembresia>(["PENDIENTE_INVITACION", "SUSPENDIDA", "REVOCADA"])(
    "una membresía %s no autoriza nada, ni siquiera a un ORG_OWNER",
    (estado) => {
      const owner = membresia("ORG_OWNER", { estado });
      expect(can([owner], "organizacion:read", { organizacionId: ORG_A })).toBe(false);
    },
  );

  it("falla cerrada: si el rol necesita scope y el objetivo no lo informa, se deniega", () => {
    expect(can([membresia("ORG_OWNER")], "organizacion:read")).toBe(false);
    expect(can([enFinca1("FARM_OWNER")], "lote:read", { organizacionId: ORG_A })).toBe(false); // sin fincaId
  });
});

describe("SUPER_ADMIN y PLATFORM_SUPPORT", () => {
  it("SUPER_ADMIN puede todo, sin scope (comodín)", () => {
    const root = [membresia("SUPER_ADMIN")];
    for (const recurso of RECURSOS) {
      for (const accion of ACCIONES) {
        expect(can(root, `${recurso}:${accion}`)).toBe(true);
      }
    }
  });

  it("PLATFORM_SUPPORT nunca modifica ni borra nada (mínimo privilegio, A.8.2)", () => {
    for (const recurso of RECURSOS) {
      const { acciones } = detalleCelda(MATRIZ[recurso].PLATFORM_SUPPORT);
      expect(acciones).not.toContain("update");
      expect(acciones).not.toContain("delete");
    }
  });

  it("PLATFORM_SUPPORT no ve finanzas, facturación ni inversionistas", () => {
    const soporte = [membresia("PLATFORM_SUPPORT")];
    for (const permiso of [
      "finanzasVer:read",
      "finanzasEditar:read",
      "facturacion:read",
      "inversionista:read",
    ] as Permiso[]) {
      expect(can(soporte, permiso, { organizacionId: ORG_B })).toBe(false);
    }
  });

  it("PLATFORM_SUPPORT puede leer metadatos operativos de cualquier tenant y solicitar impersonación", () => {
    const soporte = [membresia("PLATFORM_SUPPORT")];
    expect(can(soporte, "finca:read", { organizacionId: ORG_B, fincaId: FINCA_2 })).toBe(true);
    expect(can(soporte, "impersonarUsuario:create")).toBe(true);
  });

  it("solo SUPER_ADMIN y PLATFORM_SUPPORT tocan 'impersonarUsuario'", () => {
    for (const rol of ROLES) {
      const { acciones } = detalleCelda(MATRIZ.impersonarUsuario[rol]);
      if (rol === "SUPER_ADMIN" || rol === "PLATFORM_SUPPORT") continue;
      expect(acciones).toHaveLength(0);
    }
  });

  it("solo SUPER_ADMIN puede crear o borrar organizaciones", () => {
    for (const rol of ROLES) {
      const { acciones } = detalleCelda(MATRIZ.organizacion[rol]);
      if (rol === "SUPER_ADMIN") continue;
      expect(acciones).not.toContain("create");
      expect(acciones).not.toContain("delete");
    }
  });
});

describe("INVESTOR y BUYER — solo lectura, y siempre condicionada", () => {
  it("ninguno de los dos crea, edita ni borra nada", () => {
    for (const rol of ["INVESTOR", "BUYER"] as Rol[]) {
      for (const { permiso } of permisosDeRol(rol)) {
        expect(permiso.endsWith(":read")).toBe(true);
      }
    }
  });

  it("todos sus permisos van con condición (nada incondicional)", () => {
    for (const rol of ["INVESTOR", "BUYER"] as Rol[]) {
      for (const p of permisosDeRol(rol)) {
        expect(p.condicion).toBeDefined();
      }
    }
  });

  it("INVESTOR solo lee los cultivos y finanzas de lo que financia", () => {
    const inversionista = [membresia("INVESTOR", { cultivosFinanciados: ["cultivo-1"] })];
    expect(can(inversionista, "cultivo:read", { organizacionId: ORG_A, cultivoId: "cultivo-1" })).toBe(true);
    expect(can(inversionista, "finanzasVer:read", { organizacionId: ORG_A, cultivoId: "cultivo-1" })).toBe(true);
    // otro cultivo de la misma finca (el caso del ADR: café sí, cacao no)
    expect(can(inversionista, "cultivo:read", { organizacionId: ORG_A, cultivoId: "cultivo-2" })).toBe(false);
    // sin informar cultivo → falla cerrada
    expect(can(inversionista, "cultivo:read", { organizacionId: ORG_A })).toBe(false);
    // nunca finanzas de edición ni lotes
    expect(can(inversionista, "finanzasEditar:read", { organizacionId: ORG_A, cultivoId: "cultivo-1" })).toBe(false);
    expect(can(inversionista, "lote:read", { organizacionId: ORG_A, cultivoId: "cultivo-1" })).toBe(false);
  });

  it("INVESTOR de otra organización no cuela por tener el mismo id de cultivo", () => {
    const inversionista = [membresia("INVESTOR", { cultivosFinanciados: ["cultivo-1"] })];
    expect(can(inversionista, "cultivo:read", { organizacionId: ORG_B, cultivoId: "cultivo-1" })).toBe(false);
  });

  it("BUYER solo lee un cultivo a través de un enlace compartido", () => {
    const comprador = [membresia("BUYER")];
    expect(can(comprador, "cultivo:read", { organizacionId: ORG_A, cultivoId: "c1", viaEnlaceCompartido: true })).toBe(true);
    expect(can(comprador, "cultivo:read", { organizacionId: ORG_A, cultivoId: "c1" })).toBe(false);
    expect(can(comprador, "finanzasVer:read", { organizacionId: ORG_A, cultivoId: "c1", viaEnlaceCompartido: true })).toBe(false);
  });
});

describe("aislamiento por scope", () => {
  it("ORG_OWNER solo actúa dentro de SU organización", () => {
    const owner = [membresia("ORG_OWNER")];
    expect(can(owner, "organizacion:update", { organizacionId: ORG_A })).toBe(true);
    expect(can(owner, "organizacion:update", { organizacionId: ORG_B })).toBe(false);
  });

  it("FARM_OWNER solo actúa en SU finca, no en otra finca de la misma organización", () => {
    const dueno = [enFinca1("FARM_OWNER")];
    expect(can(dueno, "lote:delete", objetivoFinca1)).toBe(true);
    expect(can(dueno, "lote:delete", { organizacionId: ORG_A, fincaId: FINCA_2 })).toBe(false);
    expect(can(dueno, "lote:delete", { organizacionId: ORG_B, fincaId: FINCA_1 })).toBe(false);
  });

  it("un rol de finca sin fincaId en su membresía (dato corrupto) no autoriza nada", () => {
    expect(can([membresia("FARM_OWNER")], "lote:read", objetivoFinca1)).toBe(false);
  });

  it("el Audit log de FARM_OWNER/FARM_ADMIN queda acotado a su finca (R* del ADR)", () => {
    expect(can([enFinca1("FARM_ADMIN")], "auditLog:read", objetivoFinca1)).toBe(true);
    expect(can([enFinca1("FARM_ADMIN")], "auditLog:read", { organizacionId: ORG_A, fincaId: FINCA_2 })).toBe(false);
  });
});

describe("matriz §4 — celdas concretas", () => {
  it("ORG_OWNER: Organization = RU, no puede crearla ni borrarla", () => {
    const owner = [membresia("ORG_OWNER")];
    const o = { organizacionId: ORG_A };
    expect(can(owner, "organizacion:read", o)).toBe(true);
    expect(can(owner, "organizacion:update", o)).toBe(true);
    expect(can(owner, "organizacion:create", o)).toBe(false);
    expect(can(owner, "organizacion:delete", o)).toBe(false);
  });

  it("ORG_ADMIN: administra usuarios y fincas pero solo LEE la facturación", () => {
    const admin = [membresia("ORG_ADMIN")];
    const o = { organizacionId: ORG_A };
    expect(can(admin, "facturacion:read", o)).toBe(true);
    expect(can(admin, "facturacion:update", o)).toBe(false);
    expect(can(admin, "finca:delete", o)).toBe(true);
    expect(can(admin, "invitarUsuario:create", o)).toBe(true);
    expect(can(admin, "invitarUsuario:delete", o)).toBe(false); // CRU, sin D
  });

  it("ORG_OWNER/ORG_ADMIN solo LEEN la actividad de campo (por eso el OWNER actual necesita FARM_OWNER)", () => {
    const o = { organizacionId: ORG_A };
    expect(can([membresia("ORG_OWNER")], "actividadCampo:read", o)).toBe(true);
    expect(can([membresia("ORG_OWNER")], "actividadCampo:create", o)).toBe(false);
    expect(can([membresia("ORG_ADMIN")], "actividadCampo:update", o)).toBe(false);
  });

  it("ORG_ADMIN solo lee las finanzas (no las edita)", () => {
    const admin = [membresia("ORG_ADMIN")];
    expect(can(admin, "finanzasEditar:read", { organizacionId: ORG_A })).toBe(true);
    expect(can(admin, "finanzasEditar:update", { organizacionId: ORG_A })).toBe(false);
  });

  it("FARM_COLLABORATOR: registra actividades y cultivos, pero sin finanzas ni borrados", () => {
    const tecnico = [enFinca1("FARM_COLLABORATOR")];
    expect(can(tecnico, "actividadCampo:create", objetivoFinca1)).toBe(true);
    expect(can(tecnico, "cultivo:update", objetivoFinca1)).toBe(true);
    expect(can(tecnico, "cultivo:delete", objetivoFinca1)).toBe(false);
    expect(can(tecnico, "lote:create", objetivoFinca1)).toBe(false);
    expect(can(tecnico, "finanzasVer:read", objetivoFinca1)).toBe(false);
    expect(can(tecnico, "finanzasEditar:read", objetivoFinca1)).toBe(false);
    expect(can(tecnico, "diagnosticoIA:create", objetivoFinca1)).toBe(true);
  });

  it("FARM_ADMIN no puede borrar la finca ni gestionar inversionistas; FARM_OWNER sí gestiona (CRU)", () => {
    expect(can([enFinca1("FARM_ADMIN")], "finca:delete", objetivoFinca1)).toBe(false);
    expect(can([enFinca1("FARM_ADMIN")], "inversionista:read", objetivoFinca1)).toBe(false);
    expect(can([enFinca1("FARM_OWNER")], "inversionista:create", objetivoFinca1)).toBe(true);
    expect(can([enFinca1("FARM_OWNER")], "inversionista:delete", objetivoFinca1)).toBe(false);
  });

  it("FARM_OWNER lee/edita su finca pero no la crea ni la borra", () => {
    const dueno = [enFinca1("FARM_OWNER")];
    expect(can(dueno, "finca:update", objetivoFinca1)).toBe(true);
    expect(can(dueno, "finca:create", objetivoFinca1)).toBe(false);
    expect(can(dueno, "finca:delete", objetivoFinca1)).toBe(false);
  });
});

describe("condiciones (los `*` de la matriz)", () => {
  it("FARM_OWNER gestiona la facturación solo si la organización es INDIVIDUAL", () => {
    const dueno = [enFinca1("FARM_OWNER")];
    expect(can(dueno, "facturacion:update", { organizacionId: ORG_A, tipoOrg: "INDIVIDUAL" })).toBe(true);
    expect(can(dueno, "facturacion:update", { organizacionId: ORG_A, tipoOrg: "COOPERATIVA" })).toBe(false);
    expect(can(dueno, "facturacion:update", { organizacionId: ORG_A })).toBe(false); // sin tipoOrg → falla cerrada
    expect(can(dueno, "facturacion:update", { organizacionId: ORG_B, tipoOrg: "INDIVIDUAL" })).toBe(false);
  });

  it("invitar: FARM_OWNER solo a rangos inferiores (ADMIN/COLLAB), nunca a su mismo rango ni a roles de organización", () => {
    const dueno = [enFinca1("FARM_OWNER")];
    const invitar = (rolObjetivo: Rol) => can(dueno, "invitarUsuario:create", { ...objetivoFinca1, rolObjetivo });
    expect(invitar("FARM_ADMIN")).toBe(true);
    expect(invitar("FARM_COLLABORATOR")).toBe(true);
    expect(invitar("FARM_OWNER")).toBe(false);
    expect(invitar("ORG_ADMIN")).toBe(false);
    expect(invitar("SUPER_ADMIN")).toBe(false);
  });

  it("invitar: FARM_ADMIN solo a COLLABORATOR; sin rolObjetivo no se puede crear pero sí listar", () => {
    const admin = [enFinca1("FARM_ADMIN")];
    expect(can(admin, "invitarUsuario:create", { ...objetivoFinca1, rolObjetivo: "FARM_COLLABORATOR" })).toBe(true);
    expect(can(admin, "invitarUsuario:create", { ...objetivoFinca1, rolObjetivo: "FARM_ADMIN" })).toBe(false);
    expect(can(admin, "invitarUsuario:create", objetivoFinca1)).toBe(false);
    expect(can(admin, "invitarUsuario:read", objetivoFinca1)).toBe(true);
    expect(can(admin, "invitarUsuario:read", { organizacionId: ORG_A, fincaId: FINCA_2 })).toBe(false);
  });
});

describe("varias membresías (ADR §2.1 y §6.3): unión, cada una en su scope", () => {
  it("dueño en una org + colaborador en otra: permisos distintos según dónde actúe", () => {
    const usuario: MembresiaContexto[] = [
      { rol: "FARM_OWNER", organizacionId: ORG_A, fincaId: FINCA_1, estado: "ACTIVA" },
      { rol: "FARM_COLLABORATOR", organizacionId: ORG_B, fincaId: FINCA_2, estado: "ACTIVA" },
    ];
    expect(can(usuario, "lote:delete", { organizacionId: ORG_A, fincaId: FINCA_1 })).toBe(true);
    expect(can(usuario, "lote:update", { organizacionId: ORG_B, fincaId: FINCA_2 })).toBe(true);
    expect(can(usuario, "lote:delete", { organizacionId: ORG_B, fincaId: FINCA_2 })).toBe(false);
  });

  it("revocar UNA membresía no afecta a las demás del usuario (ADR §6.4)", () => {
    const usuario: MembresiaContexto[] = [
      { rol: "FARM_OWNER", organizacionId: ORG_A, fincaId: FINCA_1, estado: "REVOCADA" },
      { rol: "FARM_COLLABORATOR", organizacionId: ORG_B, fincaId: FINCA_2, estado: "ACTIVA" },
    ];
    expect(can(usuario, "lote:read", { organizacionId: ORG_A, fincaId: FINCA_1 })).toBe(false);
    expect(can(usuario, "lote:read", { organizacionId: ORG_B, fincaId: FINCA_2 })).toBe(true);
  });
});

describe("puente desde el modelo actual", () => {
  it("cubre todos los RolOrganizacion actuales", () => {
    const actuales: RolOrganizacion[] = ["OWNER", "ADMIN_FINCA", "COLABORADOR", "INVERSIONISTA", "COMPRADOR"];
    for (const rol of actuales) {
      expect(rolLegacyARolIam(rol).length).toBeGreaterThan(0);
    }
  });

  it("OWNER de una org INDIVIDUAL = ORG_OWNER + FARM_OWNER; en una cooperativa, solo ORG_OWNER", () => {
    expect(rolLegacyARolIam("OWNER", "INDIVIDUAL")).toEqual(["ORG_OWNER", "FARM_OWNER"]);
    expect(rolLegacyARolIam("OWNER")).toEqual(["ORG_OWNER", "FARM_OWNER"]); // default INDIVIDUAL (todas las orgs actuales)
    expect(rolLegacyARolIam("OWNER", "COOPERATIVA")).toEqual(["ORG_OWNER"]);
  });

  it("ADMIN_FINCA es FARM_ADMIN, no ORG_ADMIN (está atado a fincas, no a toda la organización)", () => {
    expect(rolLegacyARolIam("ADMIN_FINCA")).toEqual(["FARM_ADMIN"]);
    expect(rolLegacyARolIam("COLABORADOR")).toEqual(["FARM_COLLABORATOR"]);
    expect(rolLegacyARolIam("INVERSIONISTA")).toEqual(["INVESTOR"]);
    expect(rolLegacyARolIam("COMPRADOR")).toEqual(["BUYER"]);
  });

  it("un dueño actual de org individual conserva su capacidad de registrar actividades (no pierde funciones)", () => {
    const soloOrgOwner = [membresia("ORG_OWNER")];
    const conMapeoCompleto = rolLegacyARolIam("OWNER").map((rol) =>
      rol === "FARM_OWNER" ? enFinca1(rol) : membresia(rol),
    );
    expect(can(soloOrgOwner, "actividadCampo:create", objetivoFinca1)).toBe(false); // lo que pasaría sin el FARM_OWNER extra
    expect(can(conMapeoCompleto, "actividadCampo:create", objetivoFinca1)).toBe(true);
    expect(can(conMapeoCompleto, "finanzasEditar:update", objetivoFinca1)).toBe(true);
  });

  it("esSuperAdmin → SUPER_ADMIN", () => {
    expect(rolesPlataformaDeUsuario({ esSuperAdmin: true })).toEqual(["SUPER_ADMIN"]);
    expect(rolesPlataformaDeUsuario({ esSuperAdmin: false })).toEqual([]);
  });
});
