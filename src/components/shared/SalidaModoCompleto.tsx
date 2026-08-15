"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, ChevronRight } from "lucide-react";
import { VISITA_COMPLETA_COOKIE, VISITA_COMPLETA_MAX_AGE_S } from "@/lib/vista-preferida";

interface SalidaModoCompletoProps {
  /** Ruta específica en modo completo — nunca el home genérico. */
  href: string;
  titulo: string;
  descripcion?: string;
  /** "card" para una tarjeta destacada (ej. dentro de un estado vacío);
   * "inline" para un link angosto dentro de una lista/fila. Mismo
   * componente, mismo mecanismo — solo cambia el envoltorio visual según
   * dónde se monta, no la lógica. */
  variante?: "card" | "inline";
}

/**
 * Único componente de "esto está disponible en modo completo" (Fase 5,
 * ADR-006, paso 2) — reutilizado en todas las exclusiones, ya decididas en
 * Fase 2 o confirmadas en el checkpoint de Fase 5, en vez de una solución
 * distinta por pantalla.
 *
 * Navegación normal (router.push), NO llama a actualizarVistaPreferida ni a
 * ninguna Server Action — la preferencia guardada del usuario no se toca.
 * Antes de navegar, escribe la cookie de "visita puntual"
 * (VISITA_COMPLETA_COOKIE, ver vista-preferida.ts).
 *
 * Nota técnica: NO es un <Link> plano. (dashboard)/layout.tsx (el
 * envoltorio sidebar-vs-nav-inferior) se reutiliza entre navegaciones
 * cliente-a-cliente dentro del mismo layout de Next.js — un <Link> normal
 * no fuerza a que se vuelva a evaluar resolverModoApp() con la cookie
 * recién escrita, así que la página de destino cargaba sin el
 * SidebarProvider que sus componentes esperan (bug real encontrado y
 * corregido durante la verificación E2E de esta fase). router.refresh()
 * después de push() fuerza esa reevaluación — mismo patrón ya usado en
 * AnchoPantallaSync.tsx/VolverModoSimple.tsx para el mismo tipo de
 * problema (una cookie que cambia el resultado del layout).
 */
export function SalidaModoCompleto({ href, titulo, descripcion, variante = "card" }: SalidaModoCompletoProps) {
  const router = useRouter();

  const ir = () => {
    document.cookie = `${VISITA_COMPLETA_COOKIE}=1; path=/; max-age=${VISITA_COMPLETA_MAX_AGE_S}; SameSite=Lax`;
    router.push(href as any);
    router.refresh();
  };

  if (variante === "inline") {
    return (
      <button
        type="button"
        onClick={ir}
        className="inline-flex items-center gap-1 text-[12px] font-semibold"
        style={{ color: "var(--color-brand-dark)" }}
      >
        <ExternalLink size={12} /> {titulo}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={ir}
      className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-left"
      style={{ background: "var(--surface-page)", border: "1px solid var(--border-subtle)" }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: "var(--color-brand-bg)" }}
      >
        <ExternalLink size={15} style={{ color: "var(--color-brand-dark)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{titulo}</div>
        {descripcion && (
          <div className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>{descripcion}</div>
        )}
      </div>
      <ChevronRight size={16} style={{ color: "var(--text-muted)" }} className="flex-shrink-0" />
    </button>
  );
}
