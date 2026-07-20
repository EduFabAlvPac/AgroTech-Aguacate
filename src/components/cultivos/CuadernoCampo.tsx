"use client";

import { useState, useEffect } from "react";
import { ClipboardList, Camera, Calendar, User, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui";

type JornalEntry = {
  id: string;
  operario: string;
  actividad: string;
  fecha: string;
  horasTrabajadas: number;
  valorDia: number;
  descripcion: string | null;
  imagen: string | null;
  lote: { nombre: string } | null;
  cultivo: { especie: string; variedad: string } | null;
};

interface CuadernoCampoProps {
  cultivoId?: string;
  loteId?: string;
}

export function CuadernoCampo({ cultivoId, loteId }: CuadernoCampoProps) {
  const [entries, setEntries] = useState<JornalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (cultivoId) params.set("cultivoId", cultivoId);
    if (loteId) params.set("loteId", loteId);

    fetch(`/api/jornales?${params.toString()}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (Array.isArray(data)) setEntries(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cultivoId, loteId]);

  if (loading) {
    return (
      <div className="card p-6 text-center text-[var(--text-muted)] text-[13px]">
        Cargando cuaderno de campo...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="card p-6 text-center">
        <ClipboardList size={28} className="mx-auto text-[var(--text-muted)] mb-3" />
        <p className="text-[14px] font-medium text-[var(--text-primary)] mb-1">
          Cuaderno de campo vacío
        </p>
        <p className="text-[12px] text-[var(--text-muted)]">
          Registra jornales y actividades para construir tu bitácora BPA-ICA.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} className="text-agro-400" />
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Cuaderno de Campo Digital
          </h3>
          <span className="badge badge-success text-[10px]">BPA-ICA</span>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">
          {entries.length} registro{entries.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Timeline */}
      <div className="divide-y divide-[var(--border-subtle)]">
        {entries.map((entry) => (
          <div key={entry.id} className="p-4 hover:bg-[var(--surface-page)] transition-colors">
            <div className="flex items-start gap-3">
              {/* Timeline dot */}
              <div className="w-8 h-8 rounded-full bg-agro-50 border border-agro-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={14} className="text-agro-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[13px] font-medium text-[var(--text-primary)]">
                    {entry.operario}
                  </span>
                  <span className="badge badge-neutral text-[10px]">
                    {entry.actividad}
                  </span>
                  {entry.imagen && (
                    <span className="badge badge-info text-[10px]">
                      <Camera size={10} /> Foto
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] mb-1">
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    {formatDate(entry.fecha, true)}
                  </span>
                  <span>{entry.horasTrabajadas}h</span>
                  <span className="font-medium text-agro-600">
                    ${entry.valorDia.toLocaleString("es-CO")}
                  </span>
                  {entry.lote && (
                    <span className="text-[var(--text-secondary)]">{entry.lote.nombre}</span>
                  )}
                </div>

                {entry.descripcion && (
                  <p className="text-[12px] text-[var(--text-secondary)] mt-1">
                    {entry.descripcion}
                  </p>
                )}

                {/* Photo evidence */}
                {entry.imagen && (
                  <div className="mt-2">
                    <button
                      onClick={() => setExpandedImage(expandedImage === entry.id ? null : entry.id)}
                      className="flex items-center gap-1 text-[11px] text-agro-400 hover:text-agro-600 font-medium"
                    >
                      {expandedImage === entry.id ? (
                        <><ChevronUp size={12} /> Ocultar evidencia</>
                      ) : (
                        <><ChevronDown size={12} /> Ver evidencia fotográfica</>
                      )}
                    </button>
                    {expandedImage === entry.id && (
                      <img
                        src={entry.imagen}
                        alt={`Evidencia: ${entry.actividad} — ${entry.operario}`}
                        className="mt-2 max-w-full max-h-64 rounded-[var(--radius-md)] border border-[var(--border-default)] object-contain"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
