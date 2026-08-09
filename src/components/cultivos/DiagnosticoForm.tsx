"use client";

import { useState } from "react";
import { Sparkles, Eye, Pill, ChevronDown, ChevronUp } from "lucide-react";
import { Button, Textarea } from "@/components/ui";
import { PhotoCapture } from "@/components/ui/PhotoCapture";
import toast from "react-hot-toast";

// Tipo local — no importar src/lib/diagnostico-ia.ts aquí (es server-only,
// hace fetch a Groq con GROQ_API_KEY; solo se usa desde el route handler).
interface DiagnosticoResultado {
  diagnostico: string;
  confianza: "alta" | "media" | "baja";
  sintomasObservados: string;
  recomendacion: string;
  coincideCatalogo: boolean;
  razonamiento?: string;
}

interface DiagnosticoFormProps {
  cultivoId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const CONFIANZA_BADGE: Record<string, string> = {
  alta: "badge-success",
  media: "badge-warning",
  baja: "badge-danger",
};

export function DiagnosticoForm({ cultivoId, onSuccess, onCancel }: DiagnosticoFormProps) {
  const [imagen, setImagen] = useState<string | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<DiagnosticoResultado | null>(null);
  const [showRazonamiento, setShowRazonamiento] = useState(false);

  const handleAnalizar = async () => {
    if (!imagen) return toast.error("Toma o sube una foto primero");
    setLoading(true);
    try {
      const res = await fetch(`/api/cultivos/${cultivoId}/diagnostico`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen, descripcion: descripcion.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al analizar la imagen");
      setResultado(json.data.diagnostico);
      toast.success("Diagnóstico agregado a la bitácora");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al analizar la imagen");
    } finally {
      setLoading(false);
    }
  };

  const handleNuevo = () => {
    setResultado(null);
    setImagen(null);
    setDescripcion("");
  };

  if (resultado) {
    return (
      <div className="space-y-4">
        {imagen && (
          <img
            src={imagen}
            alt="Foto analizada"
            className="w-full max-h-56 object-contain rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-page)]"
          />
        )}
        <div className="p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)] space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-semibold text-[var(--text-primary)]">{resultado.diagnostico}</span>
            <span className={`badge text-[10px] ${CONFIANZA_BADGE[resultado.confianza]}`}>
              Confianza {resultado.confianza}
            </span>
          </div>
          {resultado.sintomasObservados && (
            <p className="text-[12px] text-[var(--text-secondary)] flex items-start gap-1.5">
              <Eye size={13} className="mt-0.5 flex-shrink-0 text-[var(--text-muted)]" /> {resultado.sintomasObservados}
            </p>
          )}
          <p className="text-[12px] text-[var(--text-secondary)] flex items-start gap-1.5">
            <Pill size={13} className="mt-0.5 flex-shrink-0 text-[var(--text-muted)]" /> {resultado.recomendacion}
          </p>
          {!resultado.coincideCatalogo && (
            <p className="text-[11px] text-[var(--text-muted)] italic">
              No coincide con el catálogo de la ficha técnica — basado en conocimiento general del modelo. Verifica con
              un agrónomo si tienes dudas.
            </p>
          )}
        </div>
        {resultado.razonamiento && (
          <div>
            <button
              onClick={() => setShowRazonamiento((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-agro-400 hover:text-agro-600 font-medium"
            >
              {showRazonamiento ? (
                <><ChevronUp size={12} /> Ocultar análisis del modelo</>
              ) : (
                <><ChevronDown size={12} /> Ver por qué el modelo llegó a este diagnóstico</>
              )}
            </button>
            {showRazonamiento && (
              <p className="mt-2 text-[11px] text-[var(--text-muted)] whitespace-pre-line bg-[var(--surface-page)] rounded-[var(--radius-md)] p-2 max-h-40 overflow-y-auto">
                {resultado.razonamiento}
              </p>
            )}
          </div>
        )}
        <p className="text-[11px] text-agro-600 bg-agro-50 px-2 py-1.5 rounded">
          ✅ Se guardó como inspección en el cuaderno de campo.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleNuevo}>Nuevo diagnóstico</Button>
          <Button onClick={onSuccess}>Listo</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[var(--text-muted)]">
        Toma una foto de la hoja, fruto o tallo afectado. La IA la analiza contra el catálogo de plagas y enfermedades
        de la ficha técnica de este cultivo.
      </p>
      <PhotoCapture onCapture={setImagen} onRemove={() => setImagen(null)} preview={imagen} label="Foto para diagnóstico" />
      <Textarea
        label="Nota adicional (opcional)"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Ej: empezó hace 3 días, solo en las hojas de abajo..."
        rows={2}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleAnalizar} loading={loading} disabled={!imagen}>
          <Sparkles size={14} /> Analizar con IA
        </Button>
      </div>
    </div>
  );
}
