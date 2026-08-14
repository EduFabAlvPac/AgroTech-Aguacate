"use client";

import { useEffect, useState, useCallback } from "react";
import { Sprout, AlertCircle } from "lucide-react";
import { Modal, Skeleton } from "@/components/ui";
import { AnalisisSueloSection } from "@/components/cultivos/AnalisisSueloSection";
import { formatDate } from "@/lib/utils";
import type { AnalisisSuelo } from "@prisma/client";

interface RecomendacionCultivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  loteId: string;
  loteNombre: string;
  analisisInicial: AnalisisSuelo[];
}

interface FactorEvaluado {
  criterio: "altitud" | "ph";
  nivel: "OPTIMO" | "FUERA_RANGO" | "SIN_DATO";
  mensaje: string;
}
interface CandidatoRecomendacion {
  fichaTecnicaId: string;
  especie: string;
  variedad: string;
  score: number;
  factores: FactorEvaluado[];
}
interface RecomendacionData {
  loteAltitud: number | null;
  ultimoAnalisisPh: number | null;
  ultimoAnalisisFecha: string | null;
  recomendaciones: CandidatoRecomendacion[] | null;
}

const NIVEL_ICONO: Record<string, string> = { OPTIMO: "✅", FUERA_RANGO: "⚠️", SIN_DATO: "ℹ️" };

function scoreColor(score: number) {
  if (score >= 75) return { bar: "var(--color-brand)", text: "var(--color-brand-dark)" };
  if (score >= 50) return { bar: "var(--color-amber)", text: "#8A5E20" };
  return { bar: "var(--color-negative)", text: "var(--color-negative)" };
}

export function RecomendacionCultivoModal({ isOpen, onClose, loteId, loteNombre, analisisInicial }: RecomendacionCultivoModalProps) {
  const [data, setData] = useState<RecomendacionData | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lotes/${loteId}/recomendacion`);
      const json = await res.json();
      if (res.ok) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [loteId]);

  useEffect(() => {
    if (isOpen) cargar();
  }, [isOpen, cargar]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`¿Qué sembrar en ${loteNombre}?`} size="lg">
      <div className="space-y-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-[var(--radius-md)]" />
            <Skeleton className="h-20 rounded-[var(--radius-md)]" />
            <Skeleton className="h-20 rounded-[var(--radius-md)]" />
          </div>
        ) : !data || data.recomendaciones === null ? (
          <div className="flex items-start gap-3 p-4 bg-[var(--color-amber-bg)] rounded-[var(--radius-md)]">
            <AlertCircle size={18} className="text-[#8A5E20] flex-shrink-0 mt-0.5" />
            <div className="text-[13px] text-[#8A5E20]">
              <p className="font-medium mb-1">Falta la altitud del lote</p>
              <p>
                Registra la altitud de <strong>{loteNombre}</strong> (editar lote en el mapa) para poder comparar
                contra el rango ideal de cada cultivo y darte una recomendación.
              </p>
            </div>
          </div>
        ) : data.recomendaciones.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">
            Aún no hay fichas técnicas publicadas en el catálogo para comparar. Habla con el administrador de la
            plataforma.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-[12px] text-[var(--text-muted)]">
              Lote a {data.loteAltitud?.toLocaleString()} msnm
              {data.ultimoAnalisisPh != null && (
                <> · último análisis de suelo: pH {data.ultimoAnalisisPh} ({formatDate(data.ultimoAnalisisFecha!, true)})</>
              )}
            </p>

            {data.recomendaciones.map((c, i) => {
              const color = scoreColor(c.score);
              return (
                <div key={c.fichaTecnicaId} className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {i === 0 && c.score >= 50 && <Sprout size={16} className="text-agro-500" />}
                      <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                        {c.especie} {c.variedad}
                      </span>
                      {i === 0 && c.score >= 50 && (
                        <span className="badge badge-success text-[10px]">Mejor opción</span>
                      )}
                    </div>
                    <span className="text-[13px] font-bold" style={{ color: color.text }}>{c.score}%</span>
                  </div>
                  <div className="h-2 bg-[var(--surface-page)] rounded-full overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all" style={{ width: `${c.score}%`, background: color.bar }} />
                  </div>
                  <div className="space-y-1">
                    {c.factores.map((f) => (
                      <div key={f.criterio} className="text-[12px] text-[var(--text-secondary)] flex items-start gap-1.5">
                        <span>{NIVEL_ICONO[f.nivel]}</span>
                        <span>{f.mensaje.replace(/^[✅⚠️ℹ️]+\s*/, "")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AnalisisSueloSection loteId={loteId} analisisInicial={analisisInicial} onChange={cargar} />
      </div>
    </Modal>
  );
}
