"use client";

import { useEffect, useState } from "react";
import { Bell, Menu, Sun } from "lucide-react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useSidebar } from "@/components/providers/SidebarProvider";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession();
  const { toggleSidebar } = useSidebar();
  const today = format(new Date(), "EEEE d 'de' MMMM yyyy", { locale: es });

  // Punto rojo de la campana: antes se mostraba siempre, sin importar si
  // había alertas reales sin leer. GET /api/alertas ya devuelve
  // meta.noLeidas (src/app/api/alertas/route.ts) — solo faltaba consultarlo
  // aquí. Se pide una sola vez al montar (mismo patrón simple del resto de
  // la app — sin librería de fetching/polling, ver CLAUDE.md §5).
  const [noLeidas, setNoLeidas] = useState(0);
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/alertas?activas=true&limit=1")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setNoLeidas(json?.meta?.noLeidas ?? 0))
      .catch(() => {});
  }, [session?.user?.id]);

  return (
    <header className="header-bar h-16 px-6 border-b border-[var(--sidebar-border)] bg-white flex items-center justify-between flex-shrink-0">
      {/* Left: hamburger (mobile only) + Title */}
      <div className="flex items-center gap-3">
        {/* Hamburger — only visible on mobile */}
        <button
          onClick={toggleSidebar}
          className="md:hidden w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--surface-page)] transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={18} className="text-[var(--text-secondary)]" />
        </button>

        <div>
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight capitalize">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: date + status + notifications */}
      <div className="flex items-center gap-3">
        {/* Date pill */}
        <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] bg-[var(--surface-page)] px-3 py-1.5 rounded-full border border-[var(--border-subtle)]">
          <Sun size={13} className="text-harvest-200" />
          <span className="capitalize">{today}</span>
        </div>

        {/* Season badge — hidden on mobile to avoid header overflow at 375px */}
        <span className="hidden sm:inline-flex badge badge-success text-[11px]">
          <span className="stage-dot bg-agro-400"></span>
          Temporada activa
        </span>

        {/* Notifications */}
        <Link
          href="/dashboard/alertas"
          className="relative w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] hover:bg-[var(--surface-page)] transition-colors"
          aria-label="Ver alertas"
        >
          <Bell size={17} className="text-[var(--text-secondary)]" />
          {noLeidas > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-negative-400"></span>
          )}
        </Link>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-agro-50 border border-agro-100 flex items-center justify-center text-[12px] font-semibold text-agro-600">
          {session?.user?.name
            ?.split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("") ?? "AT"}
        </div>
      </div>
    </header>
  );
}
