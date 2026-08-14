"use client";

import { useRef, useState, useEffect } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface VoiceRecorderProps {
  onTranscribed: (texto: string) => void;
  label?: string;
}

/**
 * Grabador de voz para el cuaderno de campo (RF14) — mismo patrón mobile-first
 * que PhotoCapture.tsx: un botón de acción principal que cambia de estado
 * (idle → grabando → procesando) en vez de un formulario aparte.
 *
 * Graba con MediaRecorder (formato webm, el que produce el navegador sin
 * conversión) y lo manda a /api/transcribir (Whisper de Groq).
 */
export function VoiceRecorder({ onTranscribed, label }: VoiceRecorderProps) {
  const [estado, setEstado] = useState<"idle" | "grabando" | "procesando">("idle");
  const [segundos, setSegundos] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Por si el componente se desmonta a mitad de una grabación.
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const iniciarGrabacion = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Tu navegador no soporta grabación de audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribir(blob);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setEstado("grabando");
      setSegundos(0);
      timerRef.current = setInterval(() => setSegundos((s) => s + 1), 1000);
    } catch {
      toast.error("No se pudo acceder al micrófono. Revisa los permisos del navegador.");
    }
  };

  const detenerGrabacion = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  };

  const transcribir = async (blob: Blob) => {
    setEstado("procesando");
    try {
      const formData = new FormData();
      formData.append("audio", blob, "nota.webm");
      const res = await fetch("/api/transcribir", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al transcribir");
      if (!json.data.texto) {
        toast.error("No se entendió el audio — intenta de nuevo más cerca del micrófono.");
      } else {
        onTranscribed(json.data.texto);
        toast.success("Nota de voz transcrita");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al transcribir");
    } finally {
      setEstado("idle");
    }
  };

  const mmss = `${Math.floor(segundos / 60)}:${(segundos % 60).toString().padStart(2, "0")}`;

  return (
    <div>
      {label && (
        <div className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">{label}</div>
      )}

      {estado === "idle" && (
        <button
          type="button"
          onClick={iniciarGrabacion}
          className="flex items-center gap-3 w-full p-4 border-2 border-dashed border-[var(--border-default)] rounded-[var(--radius-md)] hover:border-agro-200 hover:bg-agro-50 transition-all text-left"
          style={{ minHeight: 64 }}
        >
          <div className="w-12 h-12 rounded-full bg-agro-50 flex items-center justify-center flex-shrink-0">
            <Mic size={20} className="text-agro-400" />
          </div>
          <div>
            <div className="text-[13px] font-medium text-[var(--text-primary)]">🎙️ Grabar nota de voz</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Se transcribe y se agrega a la descripción</div>
          </div>
        </button>
      )}

      {estado === "grabando" && (
        <button
          type="button"
          onClick={detenerGrabacion}
          className="flex items-center gap-3 w-full p-4 border-2 border-negative-100 bg-negative-50 rounded-[var(--radius-md)] transition-all text-left"
          style={{ minHeight: 64 }}
        >
          <div className="w-12 h-12 rounded-full bg-negative-100 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Square size={16} className="text-negative-400" fill="currentColor" />
          </div>
          <div>
            <div className="text-[13px] font-medium text-negative-600">Grabando... {mmss}</div>
            <div className="text-[11px] text-negative-400 mt-0.5">Toca para detener y transcribir</div>
          </div>
        </button>
      )}

      {estado === "procesando" && (
        <div
          className="flex items-center gap-3 w-full p-4 border-2 border-[var(--border-default)] rounded-[var(--radius-md)]"
          style={{ minHeight: 64 }}
        >
          <div className="w-12 h-12 rounded-full bg-agro-50 flex items-center justify-center flex-shrink-0">
            <Loader2 size={20} className="text-agro-400 animate-spin" />
          </div>
          <div className="text-[13px] font-medium text-[var(--text-primary)]">Transcribiendo...</div>
        </div>
      )}
    </div>
  );
}
