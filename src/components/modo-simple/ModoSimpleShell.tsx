"use client";

import { ModoSimpleHeader } from "@/components/modo-simple/ModoSimpleHeader";
import { ModoSimpleBottomNav } from "@/components/modo-simple/ModoSimpleBottomNav";

interface ModoSimpleShellProps {
  nombre: string;
  inicial: string;
  children: React.ReactNode;
}

/**
 * Shell mobile-first de "modo simple" — header + contenido + nav inferior,
 * reutilizado por las 6 pantallas. El ancho se limita a un marco tipo
 * teléfono (mismo criterio visual que el mockup aprobado); en pantallas
 * grandes queda centrado con fondo gris alrededor, no estirado a todo el
 * ancho.
 */
export function ModoSimpleShell({ nombre, inicial, children }: ModoSimpleShellProps) {
  return (
    <div className="min-h-screen flex justify-center" style={{ background: "var(--surface-page)" }}>
      <div
        className="w-full flex flex-col min-h-screen"
        style={{ maxWidth: 540, background: "white", boxShadow: "0 0 0 1px var(--border-subtle)" }}
      >
        <ModoSimpleHeader nombre={nombre} inicial={inicial} />
        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 84 }}>
          {children}
        </main>
        <ModoSimpleBottomNav />
      </div>
    </div>
  );
}
