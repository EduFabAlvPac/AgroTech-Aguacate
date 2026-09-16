"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Check, TrendingUp, TrendingDown, Minus, ClipboardList } from "lucide-react";
import { ESPECIES_CAMPESINO, FOTO_ESPECIE_CAMPESINO, type EspecieCampesinoSlug } from "@/lib/campesino-especies";
import type { CultivoResumen } from "@/lib/data/campesino-cultivos";
import { formatDate } from "@/lib/utils";
import { toggleCultivoSeleccionado } from "@/app/(campesino)/campesino/cultivos/cultivos-actions";

const TENDENCIA_ICON = { SUBIO: TrendingUp, BAJO: TrendingDown, IGUAL: Minus } as const;
const TENDENCIA_COLOR = { SUBIO: "var(--color-positive)", BAJO: "var(--color-negative)", IGUAL: "var(--text-muted)" } as const;

export function CultivosCampesinoClient({
  seleccionadosIniciales,
  cultivosIniciales,
}: {
  seleccionadosIniciales: EspecieCampesinoSlug[];
  cultivosIniciales: CultivoResumen[];
}) {
  const [seleccionados, setSeleccionados] = useState(seleccionadosIniciales);
  const [cultivos, setCultivos] = useState(cultivosIniciales);
  const [pendienteSlug, setPendienteSlug] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggle = (slug: EspecieCampesinoSlug) => {
    setPendienteSlug(slug);
    startTransition(async () => {
      try {
        const result = await toggleCultivoSeleccionado(slug);
        if (result.error || !result.seleccionados) {
          toast.error(result.error || "No se pudo guardar");
          return;
        }
        const nuevos = result.seleccionados as EspecieCampesinoSlug[];
        setSeleccionados(nuevos);
        // Si se agregó uno que no estaba en `cultivos` (sin precio/consulta
        // todavía), se completa localmente para no esperar un refresh del
        // servidor — se ve al instante igual que los demás.
        if (nuevos.includes(slug) && !cultivos.some((c) => c.slug === slug)) {
          const especie = ESPECIES_CAMPESINO.find((e) => e.slug === slug)!;
          setCultivos((prev) => [...prev, { slug, nombre: especie.nombre, foto: FOTO_ESPECIE_CAMPESINO[slug], precio: null, ultimaConsulta: null }]);
        } else if (!nuevos.includes(slug)) {
          setCultivos((prev) => prev.filter((c) => c.slug !== slug));
        }
      } finally {
        setPendienteSlug(null);
      }
    });
  };

  return (
    <div className="px-4 pt-4 pb-6">
      <h1 className="text-[19px] font-bold text-[var(--text-primary)] mb-1">Mis cultivos</h1>
      <p className="text-[13.5px] text-[var(--text-secondary)] mb-4">Toca los cultivos que manejas</p>

      <div className="flex gap-4 overflow-x-auto pb-1 mb-6" style={{ scrollbarWidth: "none" }}>
        {ESPECIES_CAMPESINO.map((e) => {
          const activo = seleccionados.includes(e.slug);
          const foto = FOTO_ESPECIE_CAMPESINO[e.slug];
          return (
            <button key={e.slug} type="button" onClick={() => toggle(e.slug)} disabled={pendienteSlug === e.slug} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16">
              <div
                className="relative w-16 h-16 rounded-full overflow-hidden transition-all"
                style={{ boxShadow: activo ? "0 0 0 3px #2F6E52" : "0 0 0 2px var(--border-default)", opacity: pendienteSlug === e.slug ? 0.6 : 1 }}
              >
                <img src={foto} alt="" className="w-full h-full object-cover" />
                {activo && (
                  <span className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(47,110,82,0.4)" }}>
                    <Check size={22} color="white" strokeWidth={3} />
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-center leading-tight" style={{ color: activo ? "#2F6E52" : "var(--text-muted)" }}>
                {e.nombre}
              </span>
            </button>
          );
        })}
      </div>

      {cultivos.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-[13px] text-[var(--text-muted)]">
            Toca las fotos de arriba para elegir qué cultivos manejas — así te mostramos su precio y tu último diagnóstico aquí mismo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cultivos.map((c) => {
            const TendIcon = c.precio ? TENDENCIA_ICON[c.precio.tendencia] : null;
            return (
              <div key={c.slug} className="rounded-2xl p-3.5 border border-[var(--border-subtle)]" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div className="flex items-center gap-3 mb-3">
                  <img src={c.foto} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[15px] text-[var(--text-primary)]">{c.nombre}</p>
                    {c.precio ? (
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] text-[var(--text-secondary)]">
                          ${c.precio.precioKg.toLocaleString("es-CO")} / {c.precio.unidad}
                        </p>
                        {TendIcon && <TendIcon size={13} style={{ color: TENDENCIA_COLOR[c.precio.tendencia] }} />}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[var(--text-muted)]">Precio aún no disponible</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-xl p-2.5 mb-3" style={{ background: "var(--surface-page)" }}>
                  <ClipboardList size={15} className="mt-0.5 flex-shrink-0 text-[var(--text-muted)]" />
                  {c.ultimaConsulta ? (
                    <p className="text-[12.5px] text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">{c.ultimaConsulta.diagnostico}</span> · {formatDate(c.ultimaConsulta.createdAt, true)}
                    </p>
                  ) : (
                    <p className="text-[12.5px] text-[var(--text-muted)]">Aún no has revisado este cultivo</p>
                  )}
                </div>

                <Link
                  href={`/campesino/diagnostico?especie=${c.slug}`}
                  className="block w-full text-center py-2.5 rounded-xl text-[13.5px] font-bold text-white"
                  style={{ background: "#2F6E52" }}
                >
                  Revisar salud
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
