"use client";

import { useState } from "react";
import type { AlertaClimatica } from "@prisma/client";
import { ModoSimpleHeader } from "@/components/modo-simple/ModoSimpleHeader";
import { ModoSimpleBottomNav } from "@/components/modo-simple/ModoSimpleBottomNav";
import { AlertasPanel } from "@/components/modo-simple/AlertasPanel";

interface ModoSimpleShellProps {
  nombre: string;
  inicial: string;
  alertas: AlertaClimatica[];
  children: React.ReactNode;
}

/**
 * Shell mobile-first de "modo simple" — header + contenido + nav inferior,
 * reutilizado por las 6 pantallas. El ancho se limita a un marco tipo
 * teléfono (mismo criterio visual que el mockup aprobado); en pantallas
 * grandes queda centrado con fondo gris alrededor, no estirado a todo el
 * ancho.
 *
 * La campana del header abre AlertasPanel (bottom-sheet) en vez de navegar
 * a /dashboard/alertas — feedback directo del usuario: esa ruta es la
 * interfaz de escritorio, no encaja dentro de modo simple. El estado del
 * panel vive aquí (Shell ya es "use client") en vez de en el Header, para
 * no acoplar el header a la lógica de abrir/cerrar.
 */
export function ModoSimpleShell({ nombre, inicial, alertas, children }: ModoSimpleShellProps) {
  const [mostrarAlertas, setMostrarAlertas] = useState(false);
  const alertasNoLeidas = alertas.filter((a) => a.activa && !a.leida).length;

  return (
    <div className="min-h-screen flex justify-center" style={{ background: "var(--surface-page)" }}>
      <div
        className="w-full flex flex-col min-h-screen"
        style={{ maxWidth: 540, background: "white", boxShadow: "0 0 0 1px var(--border-subtle)" }}
      >
        <ModoSimpleHeader
          nombre={nombre}
          inicial={inicial}
          alertasNoLeidas={alertasNoLeidas}
          onAlertasClick={() => setMostrarAlertas(true)}
        />
        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 84 }}>
          {children}
        </main>
        <ModoSimpleBottomNav />
      </div>

      {mostrarAlertas && <AlertasPanel alertas={alertas} onClose={() => setMostrarAlertas(false)} />}
    </div>
  );
}
