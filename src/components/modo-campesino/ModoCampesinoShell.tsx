"use client";

import { usePathname } from "next/navigation";
import { ModoCampesinoHeader } from "@/components/modo-campesino/ModoCampesinoHeader";
import { ModoCampesinoBottomNav } from "@/components/modo-campesino/ModoCampesinoBottomNav";

interface ModoCampesinoShellProps {
  nombre: string;
  children: React.ReactNode;
}

/**
 * Shell de la experiencia Campesino — clon paramétrico de ModoSimpleShell
 * (mismo marco de teléfono, max-width 540px) pero SIN modificar ese
 * componente: viven en árboles de rutas distintos ((campesino) vs
 * (dashboard)), ver plan §4. El botón de mic va INTEGRADO en
 * ModoCampesinoBottomNav (elevado al centro de la barra, igual que el
 * mockup validado) — ya no es un FAB flotante aparte.
 */
// Pantallas de "solo contenido" — sin header NI nav inferior: "Hablar con
// GermIAmigo" (ya tiene su propio botón de colgar) y "Bienvenida" (splash
// tras el login, antes de que el usuario navegue a ningún lado).
const PANTALLAS_SIN_CHROME = ["/campesino/hablar", "/campesino/bienvenida"];
// Pantallas con header PROPIO (de color, ver HeaderSeccion.tsx) en vez del
// header compartido — conservan la nav inferior, a diferencia de arriba.
const PANTALLAS_HEADER_PROPIO = ["/campesino/diagnostico", "/campesino/tienda", "/campesino/precios", "/campesino/clima"];

export function ModoCampesinoShell({ nombre, children }: ModoCampesinoShellProps) {
  const pathname = usePathname();
  const sinChrome = PANTALLAS_SIN_CHROME.some((p) => pathname.startsWith(p));
  // El home (mockup 2026-08-28) no lleva el header logo+"Inicio" — el
  // saludo ("¡Buenos días, {nombre}!" + campana) vive dentro del propio
  // contenido de la página. Diagnóstico/Tienda/Precios/Clima (mockups
  // 2026-08-29) tampoco: cada una lleva su propia barra de color (ver
  // HeaderSeccion.tsx, o lógica propia en DiagnosticoCampesinoClient.tsx
  // para el título dinámico por paso). Todas conservan la nav inferior, a
  // diferencia de las pantallas "sin chrome" de arriba.
  const sinHeader = sinChrome || pathname === "/campesino" || PANTALLAS_HEADER_PROPIO.some((p) => pathname.startsWith(p));

  return (
    <div className="min-h-screen flex justify-center" style={{ background: "var(--surface-page)" }}>
      <div
        className="w-full flex flex-col min-h-screen"
        style={{ maxWidth: 540, background: "white", boxShadow: "0 0 0 1px var(--border-subtle)" }}
      >
        {!sinHeader && <ModoCampesinoHeader nombre={nombre} />}
        <main className="flex-1 overflow-y-auto" style={{ paddingBottom: sinChrome ? 0 : 96 }}>
          {children}
        </main>
        {!sinChrome && <ModoCampesinoBottomNav />}
      </div>
    </div>
  );
}
