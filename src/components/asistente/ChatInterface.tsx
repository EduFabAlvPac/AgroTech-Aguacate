"use client";

import { useState, useEffect, useRef } from "react";
import { Send, RotateCcw, Mic, Image as ImageIcon, X, Eye, Pill } from "lucide-react";
import { Button, Select } from "@/components/ui";
import { VoiceRecorder } from "@/components/ui/VoiceRecorder";
import { compressImage } from "@/components/ui/PhotoCapture";
import toast from "react-hot-toast";
import type { ChatMessage } from "@prisma/client";

interface ChatInterfaceProps {
  historial: ChatMessage[];
  initialQuery?: string;
}

// Tipo local — no importar src/lib/diagnostico-ia.ts aquí (es server-only).
interface DiagnosticoResultado {
  diagnostico: string;
  confianza: "alta" | "media" | "baja";
  sintomasObservados: string;
  recomendacion: string;
  coincideCatalogo: boolean;
}

interface CultivoOption {
  id: string;
  especie: string;
  variedad: string | null;
  lote: { nombre: string };
}

type Message = {
  role: string;
  content: string;
  imagen?: string;
  diagnostico?: DiagnosticoResultado;
  alertaCreada?: boolean;
};

const CONFIANZA_BADGE: Record<string, string> = {
  alta: "badge-success",
  media: "badge-warning",
  baja: "badge-danger",
};

/** Converts the farm context API response into a text block for the AI prompt */
function buildContextString(ctx: any): string {
  if (!ctx) return "";
  const parts: string[] = [];

  if (ctx.finca) {
    parts.push(`FINCA: ${ctx.finca.nombre}, ${ctx.finca.municipio}, ${ctx.finca.departamento}. Área: ${ctx.finca.areaTotal ?? "?"} ha.`);
  }

  if (ctx.cultivos?.length > 0) {
    const cultivoLines = ctx.cultivos.map((c: any) =>
      `- ${c.lote}: ${c.especie} ${c.variedad}, etapa ${c.etapa}${c.diasDesdeSiembra != null ? `, día ${c.diasDesdeSiembra} desde siembra` : ""}${c.cantidadPlantas ? `, ${c.cantidadPlantas} plantas` : ""}`
    );
    parts.push(`CULTIVOS ACTIVOS:\n${cultivoLines.join("\n")}`);
  }

  if (ctx.alertasActivas?.length > 0) {
    const alertLines = ctx.alertasActivas.map((a: any) => `- [${a.severidad}] ${a.titulo}`);
    parts.push(`ALERTAS ACTIVAS:\n${alertLines.join("\n")}`);
  }

  if (ctx.finanzas) {
    parts.push(`FINANZAS MES ACTUAL: Gastos este mes $${ctx.finanzas.totalGastosMes?.toLocaleString("es-CO") ?? 0} COP.`);
  }

  if (ctx.metricas) {
    const m = ctx.metricas;
    parts.push(`MÉTRICAS FINANCIERAS CONSOLIDADAS:
- Costos directos acumulados: $${m.costosDirectos?.toLocaleString("es-CO")} COP (Mano obra: $${m.manoObraTotal?.toLocaleString("es-CO")}, Insumos: $${m.insumosTotal?.toLocaleString("es-CO")})
- Jornales registrados: ${m.jornalesRegistrados}
- Costos indirectos: $${m.costosIndirectos?.toLocaleString("es-CO")} COP
- COSTO TOTAL INVERTIDO: $${m.costoTotal?.toLocaleString("es-CO")} COP
- Ingresos acumulados: $${m.ingresosAcumulados?.toLocaleString("es-CO")} COP
- SALDO NETO: $${m.saldoNeto?.toLocaleString("es-CO")} COP
- Producción proyectada (plena): ${m.produccionProyectadaKg?.toLocaleString("es-CO")} kg/año
- Precio promedio compradores: $${m.precioPromedioKg?.toLocaleString("es-CO")}/kg
- Ingreso anual proyectado: $${m.ingresoProyectado?.toLocaleString("es-CO")} COP
- ROI estimado: ${m.roi?.toFixed(1)}%`);
  }

  return parts.join("\n\n");
}

export function ChatInterface({ historial, initialQuery }: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Adjuntar imagen para diagnóstico (RF15 desde el chat)
  const [cultivos, setCultivos] = useState<CultivoOption[]>([]);
  const [cultivoSeleccionado, setCultivoSeleccionado] = useState("");
  const [imagenAdjunta, setImagenAdjunta] = useState<string | null>(null);
  const [comprimiendoImagen, setComprimiendoImagen] = useState(false);

  // Grabación de voz (RF14 desde el chat)
  const [mostrarGrabadora, setMostrarGrabadora] = useState(false);

  useEffect(() => {
    fetch("/api/cultivos")
      .then((res) => res.json())
      .then(({ data }: { data: any[] }) => {
        const opciones: CultivoOption[] = (data ?? []).map((c) => ({
          id: c.id,
          especie: c.especie,
          variedad: c.variedad,
          lote: c.lote,
        }));
        setCultivos(opciones);
        if (opciones.length === 1) setCultivoSeleccionado(opciones[0].id);
      })
      .catch(() => {});
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle initial query from URL — auto-submit on mount
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      const userMessage: Message = { role: "user", content: initialQuery };
      setMessages([userMessage]);
      setIsLoading(true);

      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [userMessage] }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.content) {
            setMessages([userMessage, { role: "assistant", content: data.content }]);
          } else {
            setMessages([userMessage, { role: "assistant", content: `Error: ${data.error || "Sin respuesta"}` }]);
          }
        })
        .catch(() => {
          setMessages([userMessage, { role: "assistant", content: "Error al conectar con AgroIA." }]);
        })
        .finally(() => setIsLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Fetch dynamic farm context (runs on Node.js, has access to Prisma)
      let farmContext: string | undefined;
      try {
        const ctxRes = await fetch("/api/chat/context");
        if (ctxRes.ok) {
          const { data } = await ctxRes.json();
          farmContext = buildContextString(data);
        }
      } catch {
        // Context fetch failed silently — proceed without dynamic context
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, farmContext }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error || "No se pudo conectar con AgroIA"}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.content },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error de conexión. Verifica tu internet e intenta de nuevo." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Diagnóstico por imagen desde el chat (RF15) ─────────────────────────────
  const submitImagen = async () => {
    if (!imagenAdjunta || !cultivoSeleccionado || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim(), imagen: imagenAdjunta };
    setMessages((prev) => [...prev, userMessage]);
    const nota = input.trim();
    setInput("");
    const imagen = imagenAdjunta;
    setImagenAdjunta(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/cultivos/${cultivoSeleccionado}/diagnostico`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagen, descripcion: nota || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error al analizar la imagen");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "",
          diagnostico: json.data.diagnostico,
          alertaCreada: !!json.data.alerta,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "No se pudo analizar la imagen"}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imagenAdjunta) {
      await submitImagen();
    } else {
      await submitMessage(input);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    submitMessage(prompt);
  };

  const handleClear = () => {
    setMessages([]);
  };

  const handleAdjuntarImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (cultivos.length === 0) {
      toast.error("Registra un cultivo primero para poder diagnosticar una foto.");
      e.target.value = "";
      return;
    }
    setComprimiendoImagen(true);
    try {
      const dataUrl = await compressImage(file, 800, 0.7);
      setImagenAdjunta(dataUrl);
    } catch {
      toast.error("No se pudo procesar la imagen");
    } finally {
      setComprimiendoImagen(false);
      e.target.value = "";
    }
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
                Pregúntame sobre plagas, riego, fertilización, clima, o adjunta una foto de tu cultivo.
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
                O escribe tu pregunta, graba una nota de voz, o adjunta una foto abajo
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "#EAF3DE", border: "1px solid #C0DD97",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0, marginRight: 8, marginTop: 4
                }}>
                  🌿
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

                {msg.imagen && (
                  <img
                    src={msg.imagen}
                    alt="Foto enviada"
                    className="w-full max-w-[220px] rounded-[var(--radius-md)] mb-2 border border-white/30"
                  />
                )}

                {msg.diagnostico ? (
                  <div className="space-y-2 min-w-[220px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-[var(--text-primary)]">{msg.diagnostico.diagnostico}</span>
                      <span className={`badge text-[10px] ${CONFIANZA_BADGE[msg.diagnostico.confianza]}`}>
                        Confianza {msg.diagnostico.confianza}
                      </span>
                    </div>
                    {msg.diagnostico.sintomasObservados && (
                      <p className="text-[12px] text-[var(--text-secondary)] flex items-start gap-1.5">
                        <Eye size={13} className="mt-0.5 flex-shrink-0 text-[var(--text-muted)]" /> {msg.diagnostico.sintomasObservados}
                      </p>
                    )}
                    <p className="text-[12px] text-[var(--text-secondary)] flex items-start gap-1.5">
                      <Pill size={13} className="mt-0.5 flex-shrink-0 text-[var(--text-muted)]" /> {msg.diagnostico.recomendacion}
                    </p>
                    <p className="text-[11px] text-agro-600 bg-agro-50 px-2 py-1 rounded">
                      ✅ Guardado en el cuaderno de campo{msg.alertaCreada && " · ⚠️ Alerta generada"}
                    </p>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
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

          {/* Grabadora de voz (RF14) */}
          {mostrarGrabadora && (
            <div className="mb-2">
              <VoiceRecorder
                onTranscribed={(texto) => {
                  setInput((prev) => (prev ? `${prev} ${texto}` : texto));
                  setMostrarGrabadora(false);
                  inputRef.current?.focus();
                }}
              />
            </div>
          )}

          {/* Imagen adjunta + selector de cultivo (RF15) */}
          {(imagenAdjunta || comprimiendoImagen) && (
            <div className="mb-2 p-3 bg-[var(--surface-page)] rounded-[var(--radius-md)] border border-[var(--border-subtle)] flex items-start gap-3">
              {comprimiendoImagen ? (
                <div className="w-16 h-16 rounded-[var(--radius-md)] bg-white flex items-center justify-center flex-shrink-0 text-[11px] text-[var(--text-muted)]">
                  ...
                </div>
              ) : (
                <div className="relative flex-shrink-0">
                  <img src={imagenAdjunta!} alt="Foto a analizar" className="w-16 h-16 rounded-[var(--radius-md)] object-cover" />
                  <button
                    onClick={() => setImagenAdjunta(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                    aria-label="Quitar foto"
                  >
                    <X size={11} />
                  </button>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[var(--text-muted)] mb-1.5">¿Sobre qué cultivo es esta foto?</p>
                <Select
                  value={cultivoSeleccionado}
                  onChange={(e) => setCultivoSeleccionado(e.target.value)}
                  options={cultivos.map((c) => ({ value: c.id, label: `${c.especie} ${c.variedad ?? ""} — ${c.lote.nombre}`.trim() }))}
                  placeholder="Selecciona un cultivo"
                />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <button
              type="button"
              onClick={() => setMostrarGrabadora((v) => !v)}
              disabled={isLoading}
              title="Grabar nota de voz"
              className={`h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                mostrarGrabadora ? "bg-agro-100 text-agro-600" : "bg-[var(--surface-page)] text-[var(--text-muted)] hover:text-agro-600"
              }`}
            >
              <Mic size={17} />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || comprimiendoImagen}
              title="Adjuntar foto para diagnóstico"
              className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 bg-[var(--surface-page)] text-[var(--text-muted)] hover:text-agro-600 transition-colors"
            >
              <ImageIcon size={17} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAdjuntarImagen} />

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={imagenAdjunta ? "Agrega una nota (opcional)..." : "Pregunta sobre plagas, riego, fertilización, clima..."}
              className="flex-1 h-11 px-4 text-[13px] bg-[var(--surface-page)] border border-[var(--border-default)] rounded-[var(--radius-xl)] focus:outline-none focus:ring-2 focus:ring-agro-200 focus:border-agro-400 transition-all"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={(imagenAdjunta ? !cultivoSeleccionado : !input.trim()) || isLoading}
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
