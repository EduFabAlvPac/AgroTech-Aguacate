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
  | "inversionistas"
  | "asistente"
  | "alertas"
  | "compradores";

export const MODULOS_DASHBOARD: { key: ModuloKey; label: string; href: string }[] = [
  { key: "cultivos", label: "Cultivos", href: "/dashboard/cultivos" },
  { key: "mapa", label: "Mapa", href: "/dashboard/mapa" },
  { key: "finanzas", label: "Finanzas", href: "/dashboard/finanzas" },
  { key: "inversionistas", label: "Inversionistas", href: "/dashboard/inversionistas" },
  { key: "asistente", label: "Asistente IA", href: "/dashboard/asistente" },
  { key: "alertas", label: "Alertas", href: "/dashboard/alertas" },
  { key: "compradores", label: "Compradores", href: "/dashboard/compradores" },
];

/** Default razonable al crear un FincaAcceso — el dueño lo puede personalizar después. */
export function modulosPorDefecto(rolFinca: "ADMIN" | "OPERARIO" | "LECTURA"): ModuloKey[] {
  if (rolFinca === "ADMIN") {
    return MODULOS_DASHBOARD.map((m) => m.key);
  }
  // OPERARIO/LECTURA (colaborador de campo): operativo, sin módulos
  // financieros/comerciales sensibles por defecto.
  return ["cultivos", "mapa", "alertas", "asistente"];
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
