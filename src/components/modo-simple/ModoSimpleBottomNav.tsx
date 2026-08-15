"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, Sprout, CreditCard, Sparkles } from "lucide-react";

const TABS = [
  { href: "/modo-simple/inicio", label: "Inicio", icon: Home },
  { href: "/modo-simple/finca", label: "Finca", icon: MapPin },
  { href: "/modo-simple/cultivos", label: "Cultivos", icon: Sprout },
  { href: "/modo-simple/finanzas", label: "Finanzas", icon: CreditCard },
  { href: "/modo-simple/ia", label: "IA", icon: Sparkles },
] as const;

/** Nav inferior compartida de modo simple — 5 pestañas, igual en las 6
 * pantallas del mockup (Perfil no es una pestaña propia; se llega a ella
 * desde el avatar del header). */
export function ModoSimpleBottomNav() {
  const pathname = usePathname();

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
      {TABS.map(({ href, label, icon: Icon }) => {
        const activo = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href as any}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors"
            style={{ color: activo ? "var(--color-brand)" : "var(--text-muted)" }}
          >
            <Icon size={20} strokeWidth={activo ? 2.25 : 1.75} />
            <span className="text-[10.5px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
