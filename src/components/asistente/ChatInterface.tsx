"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, RotateCcw, Leaf } from "lucide-react";
import { Button } from "@/components/ui";
import type { ChatMessage } from "@prisma/client";

interface ChatInterfaceProps {
  historial: ChatMessage[];
  initialQuery?: string;
}

const QUICK_PROMPTS = [
  "¿Cómo prevenir la antracnosis en aguacate Hass recién sembrado?",
  "Plan de riego para las primeras 4 semanas post-siembra",
  "¿Cuándo debo aplicar el primer abono y qué tipo?",
  "Síntomas de helada en plántulas de aguacate y cómo actuar",
  "¿Qué plagas debo vigilar en Norte de Santander en época de siembra?",
  "Costo aproximado de insumos para 2 hectáreas en establecimiento",
];

export function ChatInterface({ historial, initialQuery }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [started, setStarted] = useState(historial.length > 0 || !!initialQuery);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, setInput } =
    useChat({
      api: "/api/chat",
      initialMessages: historial.map((m) => ({
        id: m.id,
        role: m.role.toLowerCase() as "user" | "assistant",
        content: m.content,
      })),
    });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle initial query from URL
  useEffect(() => {
    if (initialQuery && !started) {
      setInput(initialQuery);
      setStarted(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [initialQuery]);

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    setStarted(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleClear = () => {
    setMessages([]);
    setStarted(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Welcome / empty state */}
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              {/* Logo */}
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: "linear-gradient(135deg, #EAF3DE 0%, #C0DD97 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 20, fontSize: 32
              }}>
                🌿
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                Hola Eduard, soy AgroIA
              </h2>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", maxWidth: 340, lineHeight: 1.6, marginBottom: 32 }}>
                Soy tu asistente especializado en aguacate Hass para Norte de Santander.
                Pregúntame sobre plagas, riego, fertilización, clima o cualquier duda de tu cultivo.
              </p>

              {/* Categorías de preguntas */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, width: "100%", maxWidth: 480, marginBottom: 24 }}>
                {[
                  { emoji: "🐛", titulo: "Plagas y enfermedades", prompt: "¿Qué plagas son más comunes en aguacate Hass en Norte de Santander y cómo las controlo?" },
                  { emoji: "💧", titulo: "Riego y nutrición", prompt: "¿Cuál es el plan de riego óptimo para aguacate Hass en la etapa de siembra?" },
                  { emoji: "🌡️", titulo: "Clima y alertas", prompt: "¿Cómo protejo mis plantas de aguacate ante una helada nocturna?" },
                  { emoji: "💰", titulo: "Costos y finanzas", prompt: "¿Cuánto debería invertir en fertilizantes para 2 hectáreas de aguacate en establecimiento?" },
                ].map(({ emoji, titulo, prompt }) => (
                  <button
                    key={titulo}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="text-left p-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-page)] hover:border-agro-200 hover:bg-agro-50 transition-all"
                  >
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{titulo}</div>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                O escribe tu pregunta directamente abajo
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-agro-50 border border-agro-100 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <Bot size={14} className="text-agro-400" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-[var(--radius-xl)] px-4 py-3 text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-agro-400 text-white rounded-tr-none"
                    : "bg-white border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-tl-none shadow-card"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="text-[10px] font-semibold text-agro-400 mb-1.5 uppercase tracking-wide">
                    AgroIA
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start items-end gap-2">
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "#EAF3DE", border: "1px solid #C0DD97",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, flexShrink: 0
              }}>
                🌿
              </div>
              <div style={{
                background: "white",
                border: "1px solid var(--border-subtle)",
                borderRadius: "18px 18px 18px 4px",
                padding: "12px 16px",
                boxShadow: "var(--shadow-card)",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{
                    width: 6, height: 6,
                    borderRadius: "50%",
                    background: "#639922",
                    display: "inline-block",
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                AgroIA está analizando...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-[var(--border-subtle)] bg-white p-4">
        <div className="max-w-3xl mx-auto">
          {messages.length > 0 && (
            <div className="flex items-center gap-2 mb-2 justify-end">
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <RotateCcw size={11} />
                Nueva consulta
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Pregunta sobre plagas, riego, fertilización, clima..."
              className="flex-1 h-11 px-4 text-[13px] bg-[var(--surface-page)] border border-[var(--border-default)] rounded-[var(--radius-xl)] focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              loading={isLoading}
              className="h-11 w-11 rounded-full p-0 flex-shrink-0"
            >
              <Send size={16} />
            </Button>
          </form>

          <p className="text-[11px] text-[var(--text-muted)] text-center mt-2">
            AgroIA puede cometer errores. Consulta siempre con un agrónomo certificado para decisiones críticas.
          </p>
        </div>
      </div>
    </div>
  );
}
