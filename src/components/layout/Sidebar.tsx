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
  Leaf,
  LogOut,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { clsx } from "clsx";
import { useSidebar } from "@/components/providers/SidebarProvider";

const navItems = [
  { href: "/dashboard",              icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/cultivos",     icon: Sprout,          label: "Cultivos" },
  { href: "/dashboard/mapa",         icon: Map,             label: "Mapa" },
  { href: "/dashboard/finanzas",     icon: BarChart3,       label: "Finanzas" },
  { href: "/dashboard/asistente",    icon: Bot,             label: "Asistente IA" },
  { href: "/dashboard/alertas",      icon: CloudLightning,  label: "Alertas" },
  { href: "/dashboard/compradores",  icon: Users,           label: "Compradores" },
  { href: "/dashboard/configuracion",icon: Settings,        label: "Configuración" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarOpen, setSidebarOpen } = useSidebar();

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  return (
    <aside
      className={clsx(
        // Base styles (shared between mobile and desktop)
        "sidebar transition-transform duration-300 ease-in-out",
        // Desktop: always visible as normal sidebar in the flex flow
        "hidden md:flex md:flex-col md:relative md:translate-x-0",
        // Mobile: fixed overlay, shown/hidden via translate
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:flex max-md:flex-col",
        sidebarOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--sidebar-border)]">
        <div className="w-8 h-8 rounded-lg bg-agro-400 flex items-center justify-center flex-shrink-0">
          <Leaf size={16} className="text-white" />
        </div>
        <div>
          <div className="text-[15px] font-semibold text-agro-600 leading-tight">
            AgroTech
          </div>
          <div className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">
            {session?.user?.name?.split(" ")[0] ?? "Productor"}
          </div>
        </div>
      </div>

      {/* Finca info */}
      <div className="mx-3 my-3 px-3 py-2.5 bg-agro-50 rounded-[var(--radius-md)] border border-agro-100">
        <div className="text-[11px] text-agro-400 font-medium mb-0.5">Finca activa</div>
        <div className="text-[12px] text-agro-600 font-medium leading-tight">
          Finca Álvarez Pacheco
        </div>
        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
          Norte de Santander · 2 ha
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href as any}
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-all duration-150",
                isActive(href)
                  ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon
                size={17}
                className={clsx(
                  "flex-shrink-0",
                  isActive(href) ? "text-agro-600" : "text-[var(--text-muted)]"
                )}
              />
              {label}
              {label === "Alertas" && (
                <span className="ml-auto w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-semibold">
                  1
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[var(--sidebar-border)] space-y-0.5">
        <Link
          href="/dashboard/configuracion"
          className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] transition-colors"
        >
          <Settings size={17} className="text-[var(--text-muted)]" />
          Configuración
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-[13px] text-[var(--text-secondary)] hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={17} className="text-[var(--text-muted)]" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
