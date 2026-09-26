/**
 * Menú lateral: qué opciones ve cada persona y en qué orden. Pura (sin React ni
 * BD) para poder probar el orden y los permisos por rol.
 *
 * El orden sigue el recorrido real del productor, de principio a fin:
 *   1. Dashboard — vista general del día.
 *   2. Mapa → Cultivos — primero el terreno (lotes), luego lo sembrado.
 *   3. Alertas → Asistente IA — vigilar el clima y consultar cómo manejar.
 *   4. Seguros — proteger el cultivo frente a eventos climáticos.
 *   5. Finanzas → Inversionistas → Compradores — costos, quién financia y a quién se vende.
 *   6. Equipo — gestión de personas (solo dueños).
 *   7. «Plataforma» — administración de GermIA (solo Super Admin).
 */
import type { ModuloKey } from "./modulos";

export type SeccionMenu = "principal" | "plataforma";

export interface ItemMenu {
  href: string;
  label: string;
  /** Módulo delegable (src/lib/modulos.ts). Sin módulo = no se restringe por colaborador. */
  modulo?: ModuloKey;
  seccion: SeccionMenu;
}

export const TITULO_SECCION: Record<SeccionMenu, string> = {
  principal: "",
  plataforma: "Plataforma",
};

const BASE: ItemMenu[] = [
  { href: "/dashboard", label: "Dashboard", seccion: "principal" },
  { href: "/dashboard/mapa", label: "Mapa", modulo: "mapa", seccion: "principal" },
  { href: "/dashboard/cultivos", label: "Cultivos", modulo: "cultivos", seccion: "principal" },
  { href: "/dashboard/alertas", label: "Alertas", modulo: "alertas", seccion: "principal" },
  { href: "/dashboard/asistente", label: "Asistente IA", modulo: "asistente", seccion: "principal" },
  { href: "/dashboard/seguros", label: "Seguros", modulo: "seguros", seccion: "principal" },
  { href: "/dashboard/finanzas", label: "Finanzas", modulo: "finanzas", seccion: "principal" },
  // Inversionistas: decisión de producto (Fase 3), no delegable — solo dueño/Super Admin.
  { href: "/dashboard/inversionistas", label: "Inversionistas", seccion: "principal" },
  { href: "/dashboard/compradores", label: "Compradores", modulo: "compradores", seccion: "principal" },
  // Equipo: solo dueños de organización.
  { href: "/dashboard/equipo", label: "Equipo", seccion: "principal" },
];

const PLATAFORMA: ItemMenu[] = [
  { href: "/dashboard/admin/organizaciones", label: "Organizaciones (todas)", seccion: "plataforma" },
  { href: "/dashboard/admin/fichas-tecnicas", label: "Fichas técnicas", seccion: "plataforma" },
  // Contenido del modo Campesino (experiencia separada, /campesino/*).
  { href: "/dashboard/admin/precios-mercado", label: "Precios de mercado", seccion: "plataforma" },
  { href: "/dashboard/admin/productos-tienda", label: "Tienda (insumos)", seccion: "plataforma" },
  { href: "/dashboard/admin/auditoria", label: "Auditoría", seccion: "plataforma" },
];

export function construirMenu(opts: { esOwner: boolean; esSuperAdmin: boolean; modulosPermitidos: string[] | "ALL" }): ItemMenu[] {
  const { esOwner, esSuperAdmin, modulosPermitidos } = opts;
  const items = BASE.filter((i) => {
    if (i.href === "/dashboard/inversionistas") return esOwner || esSuperAdmin;
    if (i.href === "/dashboard/equipo") return esOwner;
    return !i.modulo || modulosPermitidos === "ALL" || modulosPermitidos.includes(i.modulo);
  });
  return esSuperAdmin ? [...items, ...PLATAFORMA] : items;
}
