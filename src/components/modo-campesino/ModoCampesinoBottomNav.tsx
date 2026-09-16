"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { Home, Sprout, Mic, Bell, User } from "lucide-react";

interface TabItem {
  href: Route;
  label: string;
  icon: typeof Home;
  exact: boolean;
}

// Layout calcado del mockup validado (2026-08-26): Inicio / Mis cultivos /
// mic elevado al centro / Notificaciones / Perfil — reemplaza el layout
// anterior (Diagnóstico/Tienda/Precios/Clima/Perfil), que aunque cubría las
// mismas 4 funciones, no se veía igual al mockup ya validado con campesinos.
// Esas 4 funciones se llegan desde las tarjetas de /campesino (home), no
// desde esta barra — igual que en el mockup.
const TABS: TabItem[] = [
  { href: "/campesino", label: "Inicio", icon: Home, exact: true },
  // "Mis cultivos" (2026-08-29): resumen por especie que el usuario elige
  // manejar — precio + último diagnóstico, sin modelo de Cultivo/Finca/Lote
  // detrás (decisión de producto). Ver /campesino/cultivos.
  { href: "/campesino/cultivos", label: "Mis cultivos", icon: Sprout, exact: false },
];

const TABS_DERECHA: TabItem[] = [
  { href: "/campesino/notificaciones", label: "Notificaciones", icon: Bell, exact: false },
  { href: "/campesino/perfil", label: "Mi perfil", icon: User, exact: false },
];

export function ModoCampesinoBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const renderTab = ({ href, label, icon: Icon, exact }: TabItem) => {
    const activo = exact ? pathname === href : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
        style={{ color: activo ? "var(--color-brand)" : "var(--text-muted)" }}
      >
        <Icon size={20} strokeWidth={activo ? 2.25 : 1.75} />
        <span className="text-[10px] font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-1/2 flex items-stretch flex-shrink-0"
      style={{
        width: "100%",
        maxWidth: 540,
        transform: "translateX(-50%)",
        borderTop: "1px solid var(--border-subtle)",
        background: "white",
      }}
    >
      {TABS.map(renderTab)}

      {/* Mic — botón elevado al centro (tap-to-talk hacia "Hablar con
          GermIAmigo"), mismo patrón visual que el mockup: círculo verde que
          sobresale por encima del borde de la barra, con su propia
          etiqueta "Hablar" debajo (mockup 2026-08-28). */}
      <div className="flex-1 flex flex-col items-center justify-end relative pb-2.5">
        <button
          type="button"
          onClick={() => router.push("/campesino/hablar")}
          aria-label="Hablar con GermIAmigo"
          className="flex items-center justify-center rounded-full transition-transform active:scale-95"
          style={{
            position: "absolute",
            top: -22,
            width: 58,
            height: 58,
            background: "var(--gradient-brand, var(--color-brand))",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
            border: "4px solid white",
          }}
        >
          <Mic size={23} color="white" strokeWidth={2} />
        </button>
        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
          Hablar
        </span>
      </div>

      {TABS_DERECHA.map(renderTab)}
    </nav>
  );
}
