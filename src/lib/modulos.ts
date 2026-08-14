/**
 * Catálogo de módulos/menús del dashboard que un dueño puede habilitar o
 * restringir por colaborador (FincaAcceso.modulos — ver CLAUDE.md §2.3 y
 * ADR-004). No incluye "Dashboard" (siempre visible, es la portada) ni
 * "Equipo"/"Fichas técnicas" (gateados aparte por esOwner/esSuperAdmin).
 *
 * Es una capa adicional a la matriz de permisos por recurso/acción de
 * src/lib/authz.ts: esto decide qué secciones navega la persona; authz.ts
 * sigue decidiendo qué puede hacer (crear/leer/editar/borrar) dentro de cada
 * una. Ambas capas se aplican — un módulo visible no otorga por sí solo
 * permisos que el rol no tenga.
 */
export type ModuloKey =
  | "cultivos"
  | "mapa"
  | "finanzas"
  | "asistente"
  | "alertas"
  | "compradores";

// "Inversionistas" NO está aquí a propósito: es una decisión de producto
// explícita (Fase 3 — "solo gestión del dueño, sin login de inversionista
// aún"), no un descuido. InversionCultivo/Inversionista ni siquiera están en
// el enum Recurso de authz.ts — el módulo queda fuera del sistema de
// delegación por completo (ver guard esOwner en dashboard/inversionistas/page.tsx),
// en vez de ofrecer un checkbox que un ADMIN_FINCA podría marcar sin que
// realmente le muestre datos (el modelo sigue scoped por userId del dueño).
export const MODULOS_DASHBOARD: { key: ModuloKey; label: string; href: string }[] = [
  { key: "cultivos", label: "Cultivos", href: "/dashboard/cultivos" },
  { key: "mapa", label: "Mapa", href: "/dashboard/mapa" },
  { key: "finanzas", label: "Finanzas", href: "/dashboard/finanzas" },
  { key: "asistente", label: "Asistente IA", href: "/dashboard/asistente" },
  { key: "alertas", label: "Alertas", href: "/dashboard/alertas" },
  { key: "compradores", label: "Compradores", href: "/dashboard/compradores" },
];

/**
 * Default de fábrica al crear un FincaAcceso — se usa como fallback cuando
 * el dueño de la organización no ha personalizado la plantilla de ese rol
 * todavía (ver RolModulosDefault/obtenerPlantillaModulos abajo). No borrar
 * ni volver async: sigue siendo el valor inicial que ve el formulario de
 * "Roles y permisos" la primera vez que un dueño lo abre.
 */
export function modulosPorDefecto(rolFinca: "ADMIN" | "OPERARIO" | "LECTURA"): ModuloKey[] {
  if (rolFinca === "ADMIN") {
    return MODULOS_DASHBOARD.map((m) => m.key);
  }
  // OPERARIO/LECTURA (colaborador de campo): operativo, sin módulos
  // financieros/comerciales sensibles por defecto.
  return ["cultivos", "mapa", "alertas", "asistente"];
}

export type PlantillasModulos = Record<"ADMIN" | "OPERARIO" | "LECTURA", ModuloKey[]>;

/**
 * Plantilla de módulos por rol configurada por el dueño de `organizacionId`
 * (pantalla "Roles y permisos" en Equipo) — roles sin fila en
 * RolModulosDefault todavía caen al default de fábrica de modulosPorDefecto().
 * Import dinámico de `db` para que este archivo lo puedan importar
 * componentes de cliente sin arrastrar Prisma al bundle (solo esta función
 * lo toca, es la única que corre en servidor).
 */
export async function obtenerPlantillaModulos(organizacionId: string): Promise<PlantillasModulos> {
  const { db } = await import("./db");
  const filas = await db.rolModulosDefault.findMany({ where: { organizacionId } });

  const base: PlantillasModulos = {
    ADMIN: modulosPorDefecto("ADMIN"),
    OPERARIO: modulosPorDefecto("OPERARIO"),
    LECTURA: modulosPorDefecto("LECTURA"),
  };
  for (const fila of filas) {
    base[fila.rol as "ADMIN" | "OPERARIO" | "LECTURA"] = fila.modulos as ModuloKey[];
  }
  return base;
}

/**
 * true si `modulosPermitidos` (tal como viene en session.user, ver
 * src/lib/auth.ts) incluye `modulo`. "ALL" (dueño/Super Admin) siempre pasa.
 * Guard de página — complementa (no reemplaza) el filtrado del Sidebar: sin
 * esto, un colaborador sin un módulo en su menú aún podría navegar
 * directamente a la URL.
 */
export function tieneModulo(modulosPermitidos: string[] | "ALL" | undefined, modulo: ModuloKey): boolean {
  if (!modulosPermitidos || modulosPermitidos === "ALL") return true;
  return modulosPermitidos.includes(modulo);
}
