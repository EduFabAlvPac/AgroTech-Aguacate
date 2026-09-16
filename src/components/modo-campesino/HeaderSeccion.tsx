"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Header de color propio por sección — el mismo patrón que ya tiene
 * Diagnóstico (barra de color + título centrado + flecha atrás), ahora
 * reusable para Tienda/Precios/Clima con el color de la tarjeta que
 * representa a cada una en el home (hallazgo del usuario, 2026-08-29:
 * "quiero que el encabezado de cada sección tenga el color de la tarjeta
 * que lo representa"). Diagnóstico NO usa este componente — su header
 * cambia de título según el paso (captura/resultado) y ya tiene su propia
 * lógica en DiagnosticoCampesinoClient.tsx, no se tocó.
 *
 * Los gradientes en sí viven en src/lib/campesino-gradientes.ts (no acá) —
 * ver el comentario ahí sobre por qué.
 */
interface HeaderSeccionProps {
  titulo: string;
  gradiente: string;
  trailing?: React.ReactNode;
}

export function HeaderSeccion({ titulo, gradiente, trailing }: HeaderSeccionProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between px-4 py-4 flex-shrink-0" style={{ background: gradiente }}>
      <button
        type="button"
        onClick={() => router.push("/campesino")}
        aria-label="Volver"
        className="w-9 h-9 -ml-1.5 flex items-center justify-center"
      >
        <ArrowLeft size={22} color="white" />
      </button>
      <p className="text-white text-[17px] font-bold">{titulo}</p>
      <div className="w-9 h-9 -mr-1.5 flex items-center justify-center">{trailing}</div>
    </div>
  );
}
