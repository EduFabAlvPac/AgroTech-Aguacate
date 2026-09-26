"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Settings, LogOut, ChevronDown } from "lucide-react";

/** Menú del avatar (arriba a la derecha): Configuración y Cerrar sesión. */
export function UserMenu() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  const nombre = session?.user?.name ?? "";
  const iniciales = nombre.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "GI";

  // Se cierra al navegar, al pulsar fuera o con Escape (devolviendo el foco al avatar).
  useEffect(() => setAbierto(false), [pathname]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent | TouchEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setAbierto(false); boton.current?.focus(); }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = Array.from(raiz.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
        if (items.length === 0) return;
        e.preventDefault();
        const i = items.indexOf(document.activeElement as HTMLElement);
        items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
      }
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const itemCls = "flex w-full items-center gap-3 px-4 min-h-[44px] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] focus:bg-[var(--nav-hover-bg)] focus:outline-none transition-colors text-left";

  return (
    <div ref={raiz} className="relative">
      <button
        ref={boton}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`Menú de ${nombre || "tu cuenta"}`}
        className="flex items-center gap-1 rounded-full pr-1 hover:bg-[var(--surface-page)] focus-visible:ring-2 focus-visible:ring-agro-200 transition-colors"
      >
        <span className="w-8 h-8 rounded-full bg-agro-50 border border-agro-100 flex items-center justify-center text-[12px] font-semibold text-agro-600">
          {iniciales}
        </span>
        <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${abierto ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {abierto && (
        <div
          role="menu"
          aria-label="Cuenta"
          className="absolute right-0 top-full mt-2 w-60 max-w-[calc(100vw-2rem)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-white shadow-lg z-50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
            <div className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{nombre || "Mi cuenta"}</div>
            {session?.user?.email && <div className="text-[11px] text-[var(--text-muted)] truncate">{session.user.email}</div>}
          </div>
          <Link href="/dashboard/configuracion" role="menuitem" className={itemCls} onClick={() => setAbierto(false)}>
            <Settings size={16} className="text-[var(--text-muted)]" /> Configuración
          </Link>
          <button type="button" role="menuitem" className={`${itemCls} hover:!bg-negative-50 hover:text-negative-600 border-t border-[var(--border-subtle)]`} onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut size={16} className="text-[var(--text-muted)]" /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
