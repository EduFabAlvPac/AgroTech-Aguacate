"use client";

import { useActionState, useEffect, useTransition } from "react";
import toast from "react-hot-toast";
import { ETAPA_LABELS } from "@/types";
import type { EtapaCultivo } from "@prisma/client";
import {
  cambiarEtapaCultivo,
  type CambiarEtapaState,
} from "@/app/(dashboard)/dashboard/cultivos/etapa-actions";

// Movido desde CultivosList.tsx — solo lo usa este selector.
const ETAPA_COLORS: Record<EtapaCultivo, { bg: string; color: string }> = {
  PREPARACION: { bg: "var(--color-surface-gray)", color: "var(--color-text-soft)" },
  SIEMBRA: { bg: "var(--color-amber-bg)", color: "#8A5E20" },
  ESTABLECIMIENTO: { bg: "var(--color-info-bg)", color: "var(--color-info)" },
  CRECIMIENTO: { bg: "var(--color-brand-bg)", color: "var(--color-brand-dark)" },
  PRODUCCION: { bg: "var(--color-surface-gray)", color: "var(--color-text)" } /* TODO: sin token morado en la paleta nueva */,
  COSECHA: { bg: "var(--color-amber-bg)", color: "#8A5E20" },
};

const initialState: CambiarEtapaState = {};

interface EtapaSelectProps {
  cultivoId: string;
  etapa: EtapaCultivo;
  /** El padre sigue siendo la fuente de verdad de `lotes` (afecta también
   * la barra de progreso del cultivo, que vive fuera de este componente). */
  onChanged: (nuevaEtapa: EtapaCultivo) => void;
}

export function EtapaSelect({ cultivoId, etapa, onChanged }: EtapaSelectProps) {
  const [state, dispatch] = useActionState(cambiarEtapaCultivo.bind(null, cultivoId), initialState);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    else if (state.etapa) {
      toast.success(`Etapa actualizada a ${ETAPA_LABELS[state.etapa]}`);
      onChanged(state.etapa);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <select
      value={etapa}
      onChange={(e) => startTransition(() => dispatch(e.target.value as EtapaCultivo))}
      disabled={pending}
      className="badge text-[10px] font-medium border-0 cursor-pointer rounded-full px-2 py-0.5 appearance-none pr-5"
      style={{
        // backgroundColor (no "background" shorthand) a propósito — React
        // avisa en consola si un re-render mezcla la propiedad shorthand
        // con backgroundImage/backgroundPosition/backgroundRepeat
        // (non-shorthand) para el mismo elemento. Lo encontré probando el
        // cambio de etapa en vivo — ya venía así en el <select> original
        // de CultivosList.tsx, antes de extraer este componente.
        backgroundColor: ETAPA_COLORS[etapa].bg,
        color: ETAPA_COLORS[etapa].color,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 4px center",
      }}
    >
      {(Object.keys(ETAPA_LABELS) as EtapaCultivo[]).map((op) => (
        <option key={op} value={op}>
          {ETAPA_LABELS[op]}
        </option>
      ))}
    </select>
  );
}
