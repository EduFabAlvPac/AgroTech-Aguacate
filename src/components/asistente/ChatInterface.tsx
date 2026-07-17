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
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-agro-50 flex items-center justify-center mx-auto mb-4">
                <Leaf size={28} className="text-agro-400" />
              </div>
              <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">
                AgroIA — Asistente especializado
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)] mb-8 max-w-sm mx-auto">
                Especialista en aguacate Hass para la zona Andina colombiana.
                Pregúntame sobre plagas, riego, fertilización, clima y manejo agronómico.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl mx-auto text-left">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="flex items-start gap-2.5 p-3 text-left border border-[var(--border-subtle)] rounded-[var(--radius-lg)] hover:border-agro-200 hover:bg-agro-50 transition-all group"
                  >
                    <Bot size={14} className="text-agro-400 mt-0.5 flex-shrink-0 group-hover:text-agro-600" />
                    <span className="text-[12px] text-[var(--text-secondary)] group-hover:text-agro-600">
                      {prompt}
                    </span>
                  </button>
                ))}
              </div>
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
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-agro-50 border border-agro-100 flex items-center justify-center mr-2 flex-shrink-0">
                <Bot size={14} className="text-agro-400" />
              </div>
              <div className="bg-white border border-[var(--border-subtle)] rounded-[var(--radius-xl)] rounded-tl-none px-4 py-3 shadow-card">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-agro-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-agro-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-agro-400 rounded-full animate-bounce" />
                </div>
              </div>
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
