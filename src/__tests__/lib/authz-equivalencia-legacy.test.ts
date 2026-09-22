import { describe, it, expect } from "vitest";
import type { RolOrganizacion } from "@prisma/client";
import { MATRIZ_ORGANIZACION, type Recurso, type Accion } from "@/lib/authz";
import { can, rolLegacyARolIam, type MembresiaContexto } from "@/lib/authz/policies";

/**
 * ADR-011 Sprint 2 — red de seguridad del swap de `requireAccess()`.
 *
 * `MATRIZ_ORGANIZACION` (src/lib/authz.ts) es la matriz vieja: ya NO decide
 * nada en tiempo de ejecución, se conserva exportada solo para este test.
 * Prueba, de forma exhaustiva (no muestreada — el dominio es chico y finito,
 * así que un recorrido completo es más preciso que `fast-check` acá), que
 * para cada combinación (rol legacy, recurso, acción) que la matriz vieja
 * permitía, `can()` sobre la matriz nueva (`src/lib/authz/permissions.ts`)
 * TAMBIÉN la permite — implicación en una sola dirección
 * (`legacy permite ⟹ nuevo permite`), no igualdad exacta: la matriz del ADR
 * ya traía, antes de este sprint, algunas celdas más generosas que la vieja
 * para roles/recursos que la vieja nunca cubrió (ver "permisos nuevos,
 * documentados" más abajo) — eso no es una regresión, es la matriz del ADR
 * tal como se transcribió en el PR #50, y no hay comportamiento legacy que
 * preservar ahí porque nadie lo tenía antes.
 *
 * OWNER queda afuera del recorrido: en `requireAccess()` sigue resolviéndose
 * con un bypass total ANTES de tocar `can()` (ver comentario en
 * requireAccess()), así que su comportamiento no depende de la matriz nueva
 * y no hay nada que comparar.
 */

const ORG = "org-equivalencia";
const FINCA = "finca-equivalencia";

const ROLES_LEGACY: Exclude<RolOrganizacion, "OWNER">[] = ["ADMIN_FINCA", "COLABORADOR", "INVERSIONISTA", "COMPRADOR"];
const ACCIONES: Accion[] = ["create", "read", "update", "delete"];

// Los 15 recursos que existían en `authz.ts` antes de este sprint — el único
// dominio sobre el que la matriz vieja tiene una opinión real. Los 11
// recursos "legacy" agregados a `permissions.ts` en este mismo sprint están
// incluidos (se portaron 1:1, así que deben coincidir); los 11 recursos
// originales del ADR que no tienen contraparte legacy (facturacion,
// actividadCampo, finanzasVer, etc.) no aplican acá — nunca fueron
// alcanzables vía `MATRIZ_ORGANIZACION`.
const RECURSOS_LEGACY: Recurso[] = [
  "organizacion",
  "membresia",
  "finca",
  "lote",
  "analisisSuelo",
  "cultivo",
  "registroCultivo",
  "gasto",
  "ingreso",
  "presupuesto",
  "jornal",
  "alerta",
  "comprador",
  "fichaTecnica",
  "enlaceCompartido",
];

function legacyPermite(rol: Exclude<RolOrganizacion, "OWNER">, recurso: Recurso, accion: Accion): boolean {
  return MATRIZ_ORGANIZACION[rol]?.[recurso]?.includes(accion) ?? false;
}

/** Misma construcción que hace `requireAccess()` — mismo `fincaId` para
 * todas las membresías del rol (se confía en el `ctx` de la llamada; ver
 * comentario en requireAccess() sobre por qué eso es correcto hoy). */
function nuevoPermite(rolLegacy: Exclude<RolOrganizacion, "OWNER">, recurso: Recurso, accion: Accion): boolean {
  const membresias: MembresiaContexto[] = rolLegacyARolIam(rolLegacy).map((rol) => ({
    rol,
    organizacionId: ORG,
    fincaId: FINCA,
    estado: "ACTIVA",
  }));
  return can(membresias, `${recurso}:${accion}`, { organizacionId: ORG, fincaId: FINCA });
}

/**
 * Las únicas 2 celdas donde la matriz nueva es MÁS restrictiva que la vieja
 * — ambas verificadas (`grep -rn 'requireAccess([a-zA-Z]*, "organizacion"'`/
 * `"fichaTecnica"' src/app/`) sin ningún call site real hoy, así que no
 * cambian el comportamiento de ninguna ruta:
 *  - `ADMIN_FINCA × organizacion:read`: la fila `organizacion` del ADR no le
 *    da nada a FARM_ADMIN; se dejó así (no "arreglada" a mano) porque además
 *    de no tener call site, extender ese permiso chocaría con que
 *    `alcanceBase()` exige `mismaFinca` para todo rol FARM_* — "organizacion"
 *    no es un recurso con fincaId, ese caso no encaja bien en el modelo
 *    actual y no vale la pena forzarlo para algo que nadie usa.
 *  - `INVERSIONISTA × fichaTecnica:read`: se denegó a propósito (ver
 *    comentario en `permissions.ts`) para no romper el invariante "INVESTOR/
 *    BUYER siempre van condicionados" que ya prueba otro test — fichaTecnica
 *    no es un recurso scoped a cultivo, no hay una condición real que
 *    aplicarle.
 */
const EXCEPCIONES_SIN_CALL_SITE = new Set(["ADMIN_FINCA × organizacion:read", "INVERSIONISTA × fichaTecnica:read"]);

describe("ADR-011 Sprint 2 — equivalencia MATRIZ_ORGANIZACION (legacy) → can() (nuevo)", () => {
  it("todo lo que la matriz vieja permitía, la matriz nueva también lo permite (sin regresiones, salvo las 2 excepciones documentadas sin call site real)", () => {
    const regresiones: string[] = [];

    for (const rol of ROLES_LEGACY) {
      for (const recurso of RECURSOS_LEGACY) {
        for (const accion of ACCIONES) {
          const clave = `${rol} × ${recurso}:${accion}`;
          if (legacyPermite(rol, recurso, accion) && !nuevoPermite(rol, recurso, accion) && !EXCEPCIONES_SIN_CALL_SITE.has(clave)) {
            regresiones.push(clave);
          }
        }
      }
    }

    expect(regresiones, `Regresiones encontradas (legacy permitía, can() ya no): ${regresiones.join(", ")}`).toEqual([]);
  });

  it("las 2 excepciones documentadas siguen siendo EXACTAMENTE esas 2 (si esto falla, alguien agregó una regresión nueva sin documentarla, o arregló una de las conocidas y hay que sacarla de la lista)", () => {
    const denegadasPorLaMatrizNueva: string[] = [];
    for (const rol of ROLES_LEGACY) {
      for (const recurso of RECURSOS_LEGACY) {
        for (const accion of ACCIONES) {
          if (legacyPermite(rol, recurso, accion) && !nuevoPermite(rol, recurso, accion)) {
            denegadasPorLaMatrizNueva.push(`${rol} × ${recurso}:${accion}`);
          }
        }
      }
    }
    expect(denegadasPorLaMatrizNueva.sort()).toEqual([...EXCEPCIONES_SIN_CALL_SITE].sort());
  });

  // Informativo, no una falla: documenta dónde la matriz nueva es MÁS
  // generosa que la vieja (siempre celdas que ya traía el ADR desde el PR
  // #50, no agregadas por este sprint) — para que quede a la vista en el
  // diff/reporte de test en vez de perderse.
  it("permisos nuevos, documentados (la matriz nueva da más que la vieja en algunas celdas)", () => {
    const expansiones: string[] = [];

    for (const rol of ROLES_LEGACY) {
      for (const recurso of RECURSOS_LEGACY) {
        for (const accion of ACCIONES) {
          if (!legacyPermite(rol, recurso, accion) && nuevoPermite(rol, recurso, accion)) {
            expansiones.push(`${rol} × ${recurso}:${accion}`);
          }
        }
      }
    }

    // Snapshot explícito y no `toHaveLength(0)`: si esta lista cambia, debe
    // ser una decisión visible en el diff del PR, no una sorpresa silenciosa.
    expect(expansiones.sort()).toMatchInlineSnapshot(`
      [
        "COLABORADOR × cultivo:create",
      ]
    `);
  });
});
