"use client";

import Link from "next/link";
import { Clock, Lock } from "lucide-react";

/**
 * Aviso del trial de una organización Colectivo (ADR-011 §6): cuántos días
 * quedan, o que ya está en modo lectura. Se calcula en el servidor (layout,
 * src/lib/plan.ts) y llega como props — sin estado propio, no se puede
 * "cerrar": el modo lectura no es algo que convenga esconder.
 */
export function TrialAviso({ nombre, dias, vencido, esOwner }: { nombre: string; dias: number | null; vencido: boolean; esOwner: boolean }) {
  if (!vencido && (dias === null || dias > 7)) return null; // más de 7 días: sin ruido

  const Icono = vencido ? Lock : Clock;
  return (
    <div
      role="status"
      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[12px] font-medium text-center"
      style={vencido ? { backgroundColor: "#fee2e2", color: "#991b1b" } : { backgroundColor: "var(--agro-amber)", color: "var(--agro-amber-dark)" }}
    >
      <Icono size={15} aria-hidden="true" className="shrink-0" />
      <span>
        {vencido
          ? `La prueba de ${nombre} terminó — está en modo lectura (puedes ver todo, pero no agregar ni editar).`
          : `La prueba de ${nombre} termina en ${dias} ${dias === 1 ? "día" : "días"}.`}{" "}
        {esOwner ? (
          <Link href="/dashboard/configuracion?tab=organizacion" className="underline font-semibold">
            Ver mi plan
          </Link>
        ) : (
          "Avísale a quien coordina la organización."
        )}
      </span>
    </div>
  );
}
