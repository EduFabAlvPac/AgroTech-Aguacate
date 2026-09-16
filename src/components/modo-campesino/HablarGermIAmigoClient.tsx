"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PhoneOff, Mic } from "lucide-react";
import toast from "react-hot-toast";

type Estado = "idle" | "escuchando" | "procesando" | "hablando" | "error-mic";

interface Turno {
  role: "user" | "assistant";
  content: string;
}

const ESTADO_TEXTO: Record<Estado, string> = {
  idle: "Toca el micrófono para hablar",
  escuchando: "Estoy escuchando...",
  procesando: "Pensando...",
  hablando: "GermIAmigo te está respondiendo",
  "error-mic": "No pude usar el micrófono",
};

/**
 * "Hablar con GermIAmigo" — metáfora visual de llamada telefónica (NO es
 * telefonía real, es la IA conversacional con voz). STT reutiliza el
 * pipeline ya pagado MediaRecorder→/api/transcribir (Whisper/Groq, mejor
 * precisión en español rural que SpeechRecognition nativo); TTS con
 * speechSynthesis nativo (gratis). Tap-to-talk: el usuario toca para
 * empezar/terminar de hablar en cada turno — no hay detección automática de
 * silencio.
 */
export function HablarGermIAmigoClient() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("idle");
  const [ultimaRespuesta, setUltimaRespuesta] = useState<string | null>(null);
  const historialRef = useRef<Turno[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const colgadoRef = useRef(false);

  const detenerTodo = useCallback(() => {
    colgadoRef.current = true;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    return () => detenerTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const iniciarEscucha = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setEstado("error-mic");
      toast.error("Tu navegador no soporta grabación de audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (colgadoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (colgadoRef.current) return;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await procesarAudio(blob);
      };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setEstado("escuchando");
    } catch {
      setEstado("error-mic");
      toast.error("No se pudo acceder al micrófono. Revisa los permisos del navegador.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const terminarDeHablar = () => {
    mediaRecorderRef.current?.stop();
  };

  const procesarAudio = async (blob: Blob) => {
    setEstado("procesando");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "turno.webm");
      const resTranscribir = await fetch("/api/transcribir", { method: "POST", body: fd });
      const jsonTranscribir = await resTranscribir.json();
      if (!resTranscribir.ok) throw new Error(jsonTranscribir.error || "Error al transcribir");

      const texto: string = jsonTranscribir.data?.texto ?? "";
      if (!texto.trim()) {
        toast.error("No te escuché bien — intenta de nuevo más cerca del micrófono.");
        if (!colgadoRef.current) iniciarEscucha();
        return;
      }

      historialRef.current.push({ role: "user", content: texto });

      const resHablar = await fetch("/api/campesino/hablar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, historial: historialRef.current }),
      });
      const jsonHablar = await resHablar.json();
      if (!resHablar.ok) throw new Error(jsonHablar.error || "Error al responder");

      const respuesta: string = jsonHablar.data.respuesta;
      historialRef.current.push({ role: "assistant", content: respuesta });
      setUltimaRespuesta(respuesta);
      hablar(respuesta);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Algo falló — intenta de nuevo.");
      if (!colgadoRef.current) setEstado("idle");
    }
  };

  const hablar = (texto: string) => {
    if (colgadoRef.current) return;
    setEstado("hablando");
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      // Sin TTS disponible: igual dejamos la respuesta en pantalla y
      // volvemos a escuchar.
      if (!colgadoRef.current) iniciarEscucha();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "es-CO";
    utterance.rate = 0.95;
    utterance.onend = () => {
      if (!colgadoRef.current) iniciarEscucha();
    };
    utterance.onerror = () => {
      if (!colgadoRef.current) iniciarEscucha();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const colgar = () => {
    detenerTodo();
    router.push("/campesino");
  };

  return (
    <div className="h-full flex flex-col items-center justify-between px-6 py-10" style={{ background: "linear-gradient(180deg, var(--color-brand-dark), var(--color-brand))" }}>
      <div />

      <div className="flex flex-col items-center gap-5 text-center">
        <div
          className="w-28 h-28 rounded-full overflow-hidden"
          style={{ border: "3px solid rgba(255,255,255,0.5)" }}
        >
          <img src="/img-app/icono-amigo.jpeg" alt="GermIAmigo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-[19px] font-bold text-white">{ESTADO_TEXTO[estado]}</h1>

        {estado === "escuchando" && (
          <div className="flex items-center gap-1 h-8">
            {[...Array(9)].map((_, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-white animate-pulse"
                style={{ height: 10 + (i % 4) * 6, animationDelay: `${i * 90}ms`, opacity: 0.85 }}
              />
            ))}
          </div>
        )}

        {estado === "escuchando" && (
          <p className="text-[13px] text-white/80">Habla claro y cerca del micrófono — toca el círculo cuando termines</p>
        )}
        {estado === "idle" && ultimaRespuesta === null && (
          <p className="text-[13px] text-white/80">GermIAmigo te escucha y te responde hablando</p>
        )}
        {estado === "error-mic" && (
          <p className="text-[13px] text-white/80">Revisa que le diste permiso de micrófono a GermIA en tu navegador</p>
        )}
        {ultimaRespuesta && (estado === "hablando" || estado === "idle") && (
          <p className="text-[13px] text-white/90 max-w-xs">{ultimaRespuesta}</p>
        )}
      </div>

      <div className="flex flex-col items-center gap-6">
        {(estado === "idle" || estado === "error-mic") && (
          <button
            type="button"
            onClick={iniciarEscucha}
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "white" }}
            aria-label="Empezar a hablar"
          >
            <Mic size={26} color="var(--color-brand-dark)" />
          </button>
        )}
        {estado === "escuchando" && (
          <button
            type="button"
            onClick={terminarDeHablar}
            className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
            style={{ background: "white" }}
            aria-label="Terminar de hablar"
          >
            <Mic size={26} color="var(--color-brand-dark)" />
          </button>
        )}

        <button
          type="button"
          onClick={colgar}
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: "var(--color-negative)" }}
          aria-label="Colgar"
        >
          <PhoneOff size={22} color="white" />
        </button>
      </div>
    </div>
  );
}
