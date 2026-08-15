"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { VistaPreferida } from "@prisma/client";
import { actualizarVistaPreferida } from "@/app/(dashboard)/dashboard/configuracion/config-actions";

interface VistaPreferidaSwitchProps {
  vistaActual: VistaPreferida;
  /** Estilo del contenedor exterior — el switch en sí (colores, tamaños)
   * es idéntico en ambos, pero el "card" que lo envuelve en Configuración
   * (modo completo) usa la clase .card existente; en Perfil (modo simple)
   * usa el patrón rounded-2xl + border ya establecido en esa pantalla. El
   * padre decide el envoltorio, este componente no asume ninguno. */
  className?: string;
}

const OPCIONES: { valor: VistaPreferida; label: string }[] = [
  { valor: "SIMPLE", label: "Simple" },
  { valor: "COMPLETA", label: "Completa" },
  { valor: "AUTO", label: "Automático" },
];

/**
 * Switch de 3 posiciones (Fase 3, ADR-006) — un solo componente montado en
 * Configuración (modo completo) y Perfil (modo simple), sin duplicar.
 * Cambia con un click directo (no hay formulario que enviar), mismo patrón
 * ya usado en cambiarEtapaCultivo/marcarLeida: llamada directa a la Server
 * Action dentro de startTransition, con el valor optimista reflejado de
 * inmediato en el propio estado del componente mientras la mutación real
 * corre en el servidor.
 */
export function VistaPreferidaSwitch({ vistaActual, className }: VistaPreferidaSwitchProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [seleccionOptimista, setSeleccionOptimista] = useState(vistaActual);
  const [guardando, setGuardando] = useState(false);

  const elegir = (valor: VistaPreferida) => {
    if (valor === seleccionOptimista || guardando) return;
    const anterior = seleccionOptimista;
    setSeleccionOptimista(valor);
    setGuardando(true);
    startTransition(async () => {
      const result = await actualizarVistaPreferida(valor, {});
      setGuardando(false);
      if (result.error) {
        toast.error(result.error);
        setSeleccionOptimista(anterior);
      } else {
        toast.success("Vista actualizada");
        router.refresh();
      }
    });
  };

  return (
    <div
      className={className}
      role="radiogroup"
      aria-label="Vista preferida"
    >
      <div
        className="inline-flex p-1 rounded-full w-full"
        style={{ background: "var(--surface-page)", border: "1px solid var(--border-subtle)" }}
      >
        {OPCIONES.map((op) => {
          const activa = op.valor === seleccionOptimista;
          return (
            <button
              key={op.valor}
              type="button"
              role="radio"
              aria-checked={activa}
              onClick={() => elegir(op.valor)}
              disabled={guardando}
              className="flex-1 py-2 px-3 rounded-full text-[13px] font-semibold transition-colors disabled:opacity-70"
              style={
                activa
                  ? { background: "var(--color-brand)", color: "white" }
                  : { background: "transparent", color: "var(--text-secondary)" }
              }
            >
              {op.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
