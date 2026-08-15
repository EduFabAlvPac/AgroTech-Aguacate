"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftCircle } from "lucide-react";
import { VISITA_COMPLETA_COOKIE } from "@/lib/vista-preferida";

/**
 * Banner mostrado en modo completo únicamente durante una "visita puntual"
 * (Fase 5, ADR-006, paso 2) — cuando el usuario llegó vía SalidaModoCompleto,
 * no porque su preferencia real sea Completa. Montado una sola vez en
 * (dashboard)/layout.tsx, condicionado a estaEnVisitaCompletaPuntual() —
 * visible sin importar a qué pantalla de modo completo haya navegado
 * después de entrar, no solo en la de llegada.
 *
 * Borra la cookie de visita puntual y vuelve a /dashboard — con la cookie
 * borrada, resolverModoApp vuelve a resolver por la preferencia real
 * (SIMPLE/AUTO/COMPLETA) del usuario, sin haberla tocado en ningún momento.
 */
export function VolverModoSimple() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  const volver = () => {
    setSaliendo(true);
    document.cookie = `${VISITA_COMPLETA_COOKIE}=; path=/; max-age=0`;
    router.push("/dashboard" as any);
    router.refresh();
  };

  return (
    <div
      className="flex items-center justify-center gap-2 px-4 py-2 text-[12.5px] font-medium flex-shrink-0"
      style={{ background: "var(--color-brand-bg)", color: "var(--color-brand-dark)" }}
    >
      <span>Estás viendo el modo completo temporalmente.</span>
      <button onClick={volver} disabled={saliendo} className="flex items-center gap-1 font-bold underline disabled:opacity-60">
        <ArrowLeftCircle size={13} /> Volver a modo simple
      </button>
    </div>
  );
}
