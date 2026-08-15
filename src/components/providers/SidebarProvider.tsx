"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

interface SidebarContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** false durante una "visita puntual" a modo completo en celular (ver
   * (dashboard)/layout.tsx) — no hay <Sidebar> montado para abrir, así que
   * Header.tsx oculta la hamburguesa en vez de dejar un botón que no hace
   * nada. Default true — no cambia el comportamiento en ningún otro caso. */
  sidebarDisponible: boolean;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
  children,
  sidebarDisponible = true,
}: {
  children: React.ReactNode;
  sidebarDisponible?: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate collapsed state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "true") {
        setCollapsed(true);
      }
    } catch {
      // localStorage not available (SSR, incognito, etc.) — keep default (false)
    }
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // localStorage not available — state still updates in memory
      }
      return next;
    });
  }, []);

  return (
    <SidebarContext.Provider
      value={{ sidebarOpen, setSidebarOpen, toggleSidebar, collapsed, toggleCollapsed, sidebarDisponible }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return ctx;
}
