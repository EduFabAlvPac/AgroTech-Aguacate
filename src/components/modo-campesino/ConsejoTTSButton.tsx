"use client";

import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/**
 * "Escuchar" el consejo del día — window.speechSynthesis nativo del
 * navegador (Web Speech API, ya decidido con el usuario para todo el TTS de
 * esta experiencia): gratis, sin backend, primera vez que se usa en el repo.
 */
export function ConsejoTTSButton({ texto }: { texto: string }) {
  const [hablando, setHablando] = useState(false);

  const toggle = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (hablando) {
      window.speechSynthesis.cancel();
      setHablando(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "es-CO";
    utterance.rate = 0.95;
    utterance.onend = () => setHablando(false);
    utterance.onerror = () => setHablando(false);

    window.speechSynthesis.cancel(); // corta cualquier lectura previa antes de empezar
    window.speechSynthesis.speak(utterance);
    setHablando(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-1.5 text-[12px] font-semibold rounded-full px-3 py-1.5"
      style={{ background: "var(--color-info-bg)", color: "var(--color-info)" }}
    >
      {hablando ? <VolumeX size={14} /> : <Volume2 size={14} />}
      {hablando ? "Detener" : "Escuchar"}
    </button>
  );
}
