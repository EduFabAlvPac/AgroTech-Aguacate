import { Bot, ArrowRight } from "lucide-react";
import Link from "next/link";

const PREVIEW_MESSAGES = [
  {
    role: "assistant" as const,
    content:
      "Hola Eduard, con siembra hoy en Norte de Santander (1,850 msnm) recomiendo riego cada 3 días las primeras 4 semanas. Revisa la alerta de helada del sábado.",
  },
  {
    role: "user" as const,
    content: "¿Cuánto fertilizante para 2 ha en establecimiento?",
  },
  {
    role: "assistant" as const,
    content:
      "Para 320 plantas: 160 kg de 8-20-20 (500 g/planta) al mes 2. Aplicar en 2 dosis de 80 kg. Costo estimado: $480,000 COP.",
  },
];

const SUGGESTIONS = [
  "¿Cómo prevenir la antracnosis en plántulas Hass?",
  "Plan de riego semanas 1 a 8 post-siembra",
  "Plagas más comunes en Norte de Santander",
];

export function AiChatPreview() {
  return (
    <div className="card p-5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
            <Bot size={16} className="text-indigo-500" />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
              Asistente AgroIA
            </h2>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="stage-dot w-2 h-2 bg-green-400"></span>
              <span className="text-[11px] text-[var(--text-muted)]">
                Especialista en aguacate
              </span>
            </div>
          </div>
        </div>
        <Link
          href="/dashboard/asistente"
          className="text-[12px] text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1"
        >
          Abrir <ArrowRight size={13} />
        </Link>
      </div>

      {/* Chat preview */}
      <div className="flex-1 space-y-3 mb-4 overflow-hidden">
        {PREVIEW_MESSAGES.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-[var(--radius-lg)] px-3 py-2 text-[12px] leading-relaxed ${
                msg.role === "assistant"
                  ? "bg-indigo-50 text-indigo-900 rounded-tl-none border border-indigo-100"
                  : "bg-[var(--surface-page)] text-[var(--text-primary)] rounded-tr-none border border-[var(--border-subtle)]"
              }`}
            >
              {msg.role === "assistant" && (
                <span className="text-[10px] font-semibold text-indigo-400 block mb-1">
                  AgroIA
                </span>
              )}
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border-subtle)] pt-3">
        <div className="text-[11px] text-[var(--text-muted)] mb-2">
          Preguntas frecuentes
        </div>
        <div className="space-y-1.5">
          {SUGGESTIONS.map((s, i) => (
            <Link
              key={i}
              href={`/dashboard/asistente?q=${encodeURIComponent(s)}`}
              className="flex items-center justify-between w-full text-left text-[12px] text-[var(--text-secondary)] bg-[var(--surface-page)] hover:bg-indigo-50 hover:text-indigo-700 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] transition-colors"
            >
              <span>{s}</span>
              <ArrowRight size={13} className="flex-shrink-0 ml-2 opacity-50" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
