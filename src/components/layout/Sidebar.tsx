"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sprout,
  Map,
  BarChart3,
  Bot,
  CloudLightning,
  Users,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Wallet,
  UserPlus,
  History,
  LineChart,
  ShoppingBag,
  Building2,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { clsx } from "clsx";
import { useSidebar } from "@/components/providers/SidebarProvider";
import type { ModuloKey } from "@/lib/modulos";
import { FincaSelector, type FincaOption } from "@/components/layout/FincaSelector";
import { OrganizacionSelector, type OrganizacionOption } from "@/components/layout/OrganizacionSelector";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  // Referencia a src/lib/modulos.ts — undefined significa "siempre visible"
  // (Dashboard no es un módulo restringible).
  modulo?: ModuloKey;
}

const navItems: NavItem[] = [
  { href: "/dashboard",              icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/cultivos",     icon: Sprout,          label: "Cultivos", modulo: "cultivos" },
  { href: "/dashboard/mapa",         icon: Map,             label: "Mapa", modulo: "mapa" },
  { href: "/dashboard/finanzas",     icon: BarChart3,       label: "Finanzas", modulo: "finanzas" },
  { href: "/dashboard/asistente",    icon: Bot,             label: "Asistente IA", modulo: "asistente" },
  { href: "/dashboard/alertas",      icon: CloudLightning,  label: "Alertas", modulo: "alertas" },
  { href: "/dashboard/compradores",  icon: Users,           label: "Compradores", modulo: "compradores" },
];

interface SidebarProps {
  fincas: FincaOption[];
  fincaActivaId: string | null;
  // Multi-organización: `esOwner`/`modulosPermitidos` de la organización ACTIVA,
  // calculados en el servidor (los del JWT son globales). Opcionales para no
  // romper otros montajes: sin ellos se usan los del JWT como antes.
  esOwner?: boolean;
  modulosPermitidos?: string[] | "ALL";
  organizaciones?: OrganizacionOption[];
  organizacionActivaId?: string | null;
  /** Alertas activas sin leer de la finca activa (badge del menú). */
  alertasNoLeidas?: number;
}

export function Sidebar({ fincas, fincaActivaId, esOwner: esOwnerProp, modulosPermitidos: modulosProp, organizaciones = [], organizacionActivaId = null, alertasNoLeidas = 0 }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarOpen, setSidebarOpen, collapsed, toggleCollapsed } = useSidebar();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  // modulosPermitidos: qué menús ve un colaborador/administrador de finca,
  // configurado por el dueño en el panel Equipo (src/lib/modulos.ts) — capa
  // de navegación adicional al RBAC por recurso. "ALL" para dueño/Super
  // Admin. Viene del JWT, así que un cambio solo se refleja tras cerrar y
  // volver a iniciar sesión (mismo patrón que esOwner/esSuperAdmin).
  const modulosPermitidos = modulosProp ?? session?.user?.modulosPermitidos ?? "ALL";
  const esOwner = esOwnerProp ?? !!session?.user?.esOwner;
  let items: NavItem[] = navItems.filter(
    (item) => !item.modulo || modulosPermitidos === "ALL" || modulosPermitidos.includes(item.modulo)
  );

  // Inversionistas: decisión de producto explícita (Fase 3), no delegable a
  // colaboradores todavía — no pasa por el sistema de módulos, se gatea
  // directo por esOwner igual que Equipo (ver src/lib/modulos.ts).
  if (esOwner || session?.user?.esSuperAdmin) {
    const idx = items.findIndex((i) => i.href === "/dashboard/finanzas");
    const inversionistas: NavItem = { href: "/dashboard/inversionistas", icon: Wallet, label: "Inversionistas" };
    items = [...items.slice(0, idx + 1), inversionistas, ...items.slice(idx + 1)];
  }

  // Panel de administración de fichas técnicas — solo Super Admin; Equipo —
  // solo dueños de organización (ver CLAUDE.md §2.3). Ambos flags vienen del
  // JWT, así que un cambio solo se refleja tras cerrar y volver a iniciar sesión.
  if (esOwner) {
    items = [...items, { href: "/dashboard/equipo", icon: UserPlus, label: "Equipo" }];
  }
  if (session?.user?.esSuperAdmin) {
    items = [
      ...items,
      { href: "/dashboard/admin/fichas-tecnicas", icon: ShieldCheck, label: "Fichas técnicas" },
      // Contenido del modo Campesino (experiencia separada, /campesino/*) —
      // mismo criterio de acceso que Fichas técnicas.
      { href: "/dashboard/admin/precios-mercado", icon: LineChart, label: "Precios de mercado" },
      { href: "/dashboard/admin/productos-tienda", icon: ShoppingBag, label: "Tienda (insumos)" },
      { href: "/dashboard/admin/organizaciones", icon: Building2, label: "Organizaciones (todas)" },
      { href: "/dashboard/admin/auditoria", icon: History, label: "Auditoría" },
    ];
  }

  return (
    <aside
      className={clsx(
        // Base styles (shared between mobile and desktop)
        "sidebar transition-transform duration-300 ease-in-out",
        // Desktop: always visible as normal sidebar in the flex flow
        "hidden md:flex md:flex-col md:relative md:translate-x-0",
        // Desktop collapsed width transition
        "md:transition-all md:duration-[250ms] md:ease",
        collapsed ? "md:w-[68px]" : "md:w-[220px]",
        // Mobile: fixed overlay, shown/hidden via translate (always full width)
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:flex max-md:flex-col max-md:w-[220px]",
        sidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
      )}
    >
      {/* Brand */}
      <div className={clsx(
        "flex items-center gap-2.5 border-b border-[var(--sidebar-border)]",
        collapsed ? "px-3 py-5 justify-center" : "px-5 py-5"
      )}>
        <img
          src="/icons/icon-96.png"
          alt="GermIA"
          className="w-8 h-8 rounded-lg flex-shrink-0 object-cover"
        />
        {!collapsed && (
          <div>
            <div className="text-[15px] font-semibold text-agro-600 leading-tight">
              GermIA <span className="text-[11px] font-normal" style={{ color: "var(--text-muted)" }}>PRO</span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
              {session?.user?.name?.split(" ")[0] ?? "Productor"}
            </div>
          </div>
        )}
      </div>

      {/* Selector de organización — solo con 2 o más (multi-organización) */}
      {organizaciones.length > 1 && (
        <OrganizacionSelector
          organizaciones={organizaciones}
          organizacionActivaId={organizacionActivaId}
          collapsed={collapsed}
        />
      )}

      {/* Selector de finca activa — funcionalidad de fincas (multi-finca real) */}
      <FincaSelector
        fincas={fincas}
        fincaActivaId={fincaActivaId}
        puedeCrear={esOwner}
        collapsed={collapsed}
      />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="space-y-0.5">
          {items.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href as any}
              title={collapsed ? label : undefined}
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                "flex items-center gap-3 py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-all duration-150",
                collapsed ? "px-0 justify-center" : "px-3",
                isActive(href)
                  ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon
                size={collapsed ? 20 : 17}
                className={clsx(
                  "flex-shrink-0",
                  isActive(href) ? "text-agro-600" : "text-[var(--text-muted)]"
                )}
              />
              {!collapsed && label}
              {/* Conteo REAL de alertas sin leer de la finca activa (antes era un "1"
                  fijo que nunca cambiaba). Sin alertas sin leer, no se muestra. */}
              {!collapsed && label === "Alertas" && alertasNoLeidas > 0 && (
                <span className="ml-auto min-w-5 h-5 px-1 rounded-full bg-negative-400 text-white text-[10px] flex items-center justify-center font-semibold">
                  {alertasNoLeidas > 99 ? "99+" : alertasNoLeidas}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[var(--sidebar-border)] space-y-0.5">
        {/* Toggle button — above Configuración */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          className={clsx(
            "hidden md:flex items-center gap-3 py-2.5 rounded-[var(--radius-md)] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] transition-colors w-full",
            collapsed ? "px-0 justify-center" : "px-3"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={20} className="text-[var(--text-muted)]" />
          ) : (
            <>
              <PanelLeftClose size={17} className="text-[var(--text-muted)]" />
              Colapsar
            </>
          )}
        </button>

        <Link
          href="/dashboard/configuracion"
          title={collapsed ? "Configuración" : undefined}
          className={clsx(
            "flex items-center gap-3 py-2.5 rounded-[var(--radius-md)] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] transition-colors",
            collapsed ? "px-0 justify-center" : "px-3"
          )}
        >
          <Settings size={collapsed ? 20 : 17} className="text-[var(--text-muted)]" />
          {!collapsed && "Configuración"}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Cerrar sesión" : undefined}
          className={clsx(
            "w-full flex items-center gap-3 py-2.5 rounded-[var(--radius-md)] text-[13px] text-[var(--text-secondary)] hover:bg-negative-50 hover:text-negative-600 transition-colors",
            collapsed ? "px-0 justify-center" : "px-3"
          )}
        >
          <LogOut size={collapsed ? 20 : 17} className="text-[var(--text-muted)]" />
          {!collapsed && "Cerrar sesión"}
        </button>
      </div>
    </aside>
  );
}
