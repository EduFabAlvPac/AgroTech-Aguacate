"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Send, RotateCcw, Mic, Sparkles, MapPin, X, Eye, Pill, Camera, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { VoiceRecorder } from "@/components/ui/VoiceRecorder";
import { compressImage } from "@/components/ui/PhotoCapture";

/**
 * Pantalla "Asistente IA" de modo simple (Fase 2, ADR-006). Reutiliza
 * exactamente los mismos endpoints que ChatInterface.tsx (modo completo):
 * /api/chat, /api/chat/context, /api/cultivos, /api/cultivos/[id]/diagnostico
 * — RF14 (voz) y RF15 (diagnóstico por foto) ya implementados, verificado
 * antes de construir esta pantalla. Además reutiliza
 * /api/lotes/[id]/recomendacion (RF3, motor real en
 * lib/agronomia/recomendacion-cultivo.ts) para la tarjeta "Recomendar
 * cultivo según mi finca" — confirmado con el usuario que esa lógica ya
 * existe (vive hoy en el modal de Mapa al crear un lote), así que aquí solo
 * se reutiliza, no se inventa ningún motor nuevo.
 *
 * Reescrita tras feedback directo del usuario ("la imagen del asistente IA
 * no se parece en nada" al mockup real de referencia) — antes se había
 * construido con el mismo patrón visual que ChatInterface.tsx (grid 2x2 de
 * prompts con emoji, foto adjunta desde un ícono en la barra de entrada).
 * Ahora sigue la estructura real del mockup: bloque "Asistente del Campo",
 * banner de diagnóstico por foto, tarjeta de recomendación de cultivo,
 * chips de preguntas en una sola columna, barra de entrada sin ícono de
 * foto aparte (el banner es la única entrada a RF15).
 */

interface DiagnosticoResultado {
  diagnostico: string;
  confianza: "alta" | "media" | "baja";
  sintomasObservados: string;
  recomendacion: string;
  coincideCatalogo: boolean;
  /** false = la IA no pudo diagnosticar la foto — no se guardó en la
   * bitácora (ver route.ts). Optional para no romper si algún día vuelve
   * un resultado viejo sin este campo (se trata como diagnóstico real). */
  imagenValida?: boolean;
}

interface CultivoOption {
  id: string;
  especie: string;
  variedad: string | null;
  lote: { nombre: string };
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

type Message = {
  role: string;
  content: string;
  imagen?: string;
  diagnostico?: DiagnosticoResultado;
  alertaCreada?: boolean;
  recomendacion?: RecomendacionData;
};

const CONFIANZA_STYLE: Record<string, { bg: string; color: string }> = {
  alta: { bg: "var(--color-positive-bg)", color: "var(--color-positive)" },
  media: { bg: "var(--color-amber-bg)", color: "#8A5E20" },
  baja: { bg: "var(--color-negative-bg)", color: "var(--color-negative)" },
};

const NIVEL_ICONO: Record<string, string> = { OPTIMO: "✅", FUERA_RANGO: "⚠️", SIN_DATO: "ℹ️" };

function scoreColor(score: number) {
  if (score >= 75) return { bar: "var(--color-brand)", text: "var(--color-brand-dark)" };
  if (score >= 50) return { bar: "var(--color-amber)", text: "#8A5E20" };
  return { bar: "var(--color-negative)", text: "var(--color-negative)" };
}

/** Idéntica a la de ChatInterface.tsx — arma el bloque de contexto de finca
 * para el prompt. Duplicada aquí (no exportada del original) en vez de
 * modificar ese archivo para exportarla. */
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

const PROMPTS_RAPIDOS = [
  "¿Qué plagas son más comunes en mi cultivo y cómo las controlo?",
  "¿Cuál es el plan de riego óptimo para mi cultivo en esta etapa?",
  "¿Cómo protejo mi cultivo ante una helada nocturna?",
  "¿Cuánto debería invertir en fertilizantes para mi área en establecimiento?",
];

interface AsistenteIASimpleClientProps {
  lotesDisponibles: { id: string; nombre: string }[];
}

export function AsistenteIASimpleClient({ lotesDisponibles }: AsistenteIASimpleClientProps) {
  const { data: session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const adjuntarMenuRef = useRef<HTMLDivElement>(null);
  const camaraInputId = useId();
  const galeriaInputId = useId();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [cultivos, setCultivos] = useState<CultivoOption[]>([]);
  const [cultivoSeleccionado, setCultivoSeleccionado] = useState("");
  const [imagenAdjunta, setImagenAdjunta] = useState<string | null>(null);
  const [comprimiendoImagen, setComprimiendoImagen] = useState(false);
  // Dos triggers independientes al mismo par de <input type="file"> ocultos:
  // el ícono junto al micrófono en la barra de entrada (siempre visible,
  // popover ancla arriba del ícono — pedido explícito del usuario, no
  // quitarlo) y el banner "Asistente de cultivos" (solo en el estado de
  // bienvenida, menú en línea debajo del banner). Estados separados para
  // que no se pisen si ambos existen en pantalla a la vez.
  const [mostrarMenuImagen, setMostrarMenuImagen] = useState(false);
  const [mostrarMenuBanner, setMostrarMenuBanner] = useState(false);
  const [mostrarGrabadora, setMostrarGrabadora] = useState(false);
  const [cargandoCultivos, setCargandoCultivos] = useState(true);
  const [errorCultivos, setErrorCultivos] = useState(false);

  const [loteSeleccionado, setLoteSeleccionado] = useState(lotesDisponibles[0]?.id ?? "");
  const [cargandoRecomendacion, setCargandoRecomendacion] = useState(false);

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
      .catch(() => setErrorCultivos(true))
      .finally(() => setCargandoCultivos(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cerrar el popover del ícono de la barra de entrada al tocar afuera —
  // mismo patrón que ya tenía ChatInterface.tsx en modo completo.
  useEffect(() => {
    if (!mostrarMenuImagen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (adjuntarMenuRef.current && !adjuntarMenuRef.current.contains(e.target as Node)) {
        setMostrarMenuImagen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [mostrarMenuImagen]);

  const submitMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      let farmContext: string | undefined;
      try {
        const ctxRes = await fetch("/api/chat/context");
        if (ctxRes.ok) {
          const { data } = await ctxRes.json();
          farmContext = buildContextString(data);
        }
      } catch {
        // Sin contexto dinámico si falla — igual que en ChatInterface.
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, farmContext }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error || "No se pudo conectar con AgroIA"}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Error de conexión. Verifica tu internet e intenta de nuevo." }]);
    } finally {
      setIsLoading(false);
    }
  };

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
        { role: "assistant", content: "", diagnostico: json.data.diagnostico, alertaCreada: !!json.data.alerta },
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

  // ── "Recomendar cultivo según mi finca" — reutiliza
  // /api/lotes/[id]/recomendacion (RF3) tal cual, sin ningún motor nuevo. El
  // resultado se muestra como un mensaje más del chat (mismo patrón que un
  // diagnóstico por foto), en vez de un modal aparte como en Mapa — encaja
  // mejor con que esta pantalla ES una conversación.
  const pedirRecomendacion = async () => {
    if (!loteSeleccionado || isLoading || cargandoRecomendacion) return;
    const loteNombre = lotesDisponibles.find((l) => l.id === loteSeleccionado)?.nombre ?? "este lote";
    setMessages((prev) => [...prev, { role: "user", content: `¿Qué cultivo me conviene en ${loteNombre}?` }]);
    setCargandoRecomendacion(true);
    try {
      const res = await fetch(`/api/lotes/${loteSeleccionado}/recomendacion`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo calcular la recomendación");
      setMessages((prev) => [...prev, { role: "assistant", content: "", recomendacion: json.data }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "No se pudo calcular la recomendación"}` },
      ]);
    } finally {
      setCargandoRecomendacion(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imagenAdjunta) await submitImagen();
    else await submitMessage(input);
  };

  const handleAdjuntarImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setMostrarMenuImagen(false);
    setMostrarMenuBanner(false);
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
    <div className="flex flex-col">
      {/* Inputs de archivo ocultos — compartidos por el banner de foto de
          abajo, sin importar dónde vivan en el árbol. */}
      <input id={camaraInputId} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAdjuntarImagen} />
      <input id={galeriaInputId} type="file" accept="image/*" className="hidden" onChange={handleAdjuntarImagen} />

      <div className="px-4 py-4">
        {messages.length === 0 && (
          <div className="space-y-4 mb-2">
            {/* ── Encabezado "Asistente del Campo" ── */}
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--color-brand)" }}
              >
                <Sparkles size={20} color="white" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>Asistente del Campo</h2>
                <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>Tu consultor agrícola con IA</p>
              </div>
            </div>

            {/* ── Banner: diagnóstico por foto (RF15) — única entrada a
                adjuntar imagen en esta pantalla, por fidelidad al mockup ── */}
            <button
              onClick={() => setMostrarMenuBanner((v) => !v)}
              disabled={comprimiendoImagen}
              className="w-full text-left p-4 rounded-2xl"
              style={{ background: "linear-gradient(135deg, var(--color-amber), #E0A94E)" }}
            >
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-white mb-1">
                <Sparkles size={14} /> Asistente de cultivos
              </div>
              <p className="text-[12px] text-white" style={{ opacity: 0.95 }}>
                Toma una foto de la hoja o el fruto y te ayudo a diagnosticar plagas o enfermedades.
              </p>
            </button>

            {mostrarMenuBanner && (
              <div className="flex gap-2.5 -mt-2">
                <label
                  htmlFor={camaraInputId}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-semibold cursor-pointer"
                  style={{ background: "var(--surface-page)", color: "var(--text-primary)" }}
                >
                  <Camera size={15} /> Tomar foto
                </label>
                <label
                  htmlFor={galeriaInputId}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12.5px] font-semibold cursor-pointer"
                  style={{ background: "var(--surface-page)", color: "var(--text-primary)" }}
                >
                  <ImageIcon size={15} /> Galería
                </label>
              </div>
            )}

            {/* ── Tarjeta: recomendar cultivo según lote (RF3, reutilizada) ── */}
            {lotesDisponibles.length > 0 && (
              <div className="p-4 rounded-2xl" style={{ background: "var(--color-brand-bg)", border: "1px solid #A0DBC3" }}>
                <div className="flex items-center gap-1.5 text-[13px] font-bold mb-2.5" style={{ color: "var(--color-brand-dark)" }}>
                  <Sparkles size={14} /> Recomendar cultivo según mi finca
                </div>
                <select
                  value={loteSeleccionado}
                  onChange={(e) => setLoteSeleccionado(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl text-[13px] mb-2.5"
                  style={{ border: "1px solid var(--border-default)", background: "white" }}
                >
                  {lotesDisponibles.map((l) => (
                    <option key={l.id} value={l.id}>{l.nombre}</option>
                  ))}
                </select>
                <button
                  onClick={pedirRecomendacion}
                  disabled={cargandoRecomendacion}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-60"
                  style={{ background: "var(--color-brand)", color: "white" }}
                >
                  <MapPin size={14} /> {cargandoRecomendacion ? "Calculando..." : "¿Qué cultivo me conviene?"}
                </button>
              </div>
            )}

            {/* ── Chips de preguntas rápidas — una sola columna, sin emoji ── */}
            <div className="space-y-2">
              {PROMPTS_RAPIDOS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => submitMessage(prompt)}
                  className="w-full text-left px-4 py-2.5 rounded-full text-[12.5px] font-medium"
                  style={{ background: "var(--color-brand-bg)", color: "var(--color-brand-dark)", border: "1px solid #A0DBC3" }}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {errorCultivos && (
              <p className="text-[11px]" style={{ color: "var(--color-negative)" }}>
                No se pudo cargar la lista de tus cultivos. El chat funciona igual; el diagnóstico por foto podría no estar disponible.
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                style={
                  msg.role === "user"
                    ? { background: "var(--color-brand)", color: "white", borderTopRightRadius: 4 }
                    : { background: "white", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", borderTopLeftRadius: 4 }
                }
              >
                {msg.role === "assistant" && (
                  <div className="text-[10px] font-bold mb-1 uppercase tracking-wide" style={{ color: "var(--color-brand)" }}>AgroIA</div>
                )}

                {msg.imagen && (
                  <img src={msg.imagen} alt="Foto enviada" className="w-full max-w-[200px] rounded-xl mb-2" />
                )}

                {msg.diagnostico ? (
                  msg.diagnostico.imagenValida === false ? (
                    // La IA no pudo diagnosticar esta foto — no se guardó
                    // en la bitácora (ver route.ts), así que tampoco se le
                    // dice al usuario que se guardó nada. Hallazgo real del
                    // usuario, 2026-08-15: antes esto se veía igual que un
                    // diagnóstico exitoso, con un "✅ Guardado" confuso.
                    <div className="space-y-1.5 min-w-[200px]">
                      <p className="text-[13px] flex items-start gap-1.5" style={{ color: "var(--text-primary)" }}>
                        <Camera size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-amber)" }} /> {msg.diagnostico.diagnostico}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 min-w-[200px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{msg.diagnostico.diagnostico}</span>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={CONFIANZA_STYLE[msg.diagnostico.confianza]}
                        >
                          Confianza {msg.diagnostico.confianza}
                        </span>
                      </div>
                      {msg.diagnostico.sintomasObservados && (
                        <p className="text-[12px] flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
                          <Eye size={13} className="mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} /> {msg.diagnostico.sintomasObservados}
                        </p>
                      )}
                      <p className="text-[12px] flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        <Pill size={13} className="mt-0.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} /> {msg.diagnostico.recomendacion}
                      </p>
                      <p className="text-[11px] px-2 py-1 rounded-lg" style={{ color: "var(--color-brand-dark)", background: "var(--color-brand-bg)" }}>
                        ✅ Guardado en el cuaderno de campo{msg.alertaCreada && " · ⚠️ Alerta generada"}
                      </p>
                    </div>
                  )
                ) : msg.recomendacion ? (
                  <div className="space-y-2 min-w-[220px]">
                    {msg.recomendacion.recomendaciones === null ? (
                      <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                        Falta la altitud de este lote — regístrala en el mapa (editar lote) para poder comparar contra el rango ideal de cada cultivo.
                      </p>
                    ) : msg.recomendacion.recomendaciones.length === 0 ? (
                      <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                        Aún no hay fichas técnicas publicadas en el catálogo para comparar.
                      </p>
                    ) : (
                      <>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          Lote a {msg.recomendacion.loteAltitud?.toLocaleString()} msnm
                          {msg.recomendacion.ultimoAnalisisPh != null && <> · pH {msg.recomendacion.ultimoAnalisisPh}</>}
                        </p>
                        {msg.recomendacion.recomendaciones.slice(0, 3).map((c, i) => {
                          const color = scoreColor(c.score);
                          return (
                            <div key={c.fichaTecnicaId} className="p-2.5 rounded-xl" style={{ background: "var(--surface-page)" }}>
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[12.5px] font-semibold" style={{ color: "var(--text-primary)" }}>
                                  {i === 0 && c.score >= 50 && "🌱 "}{c.especie} {c.variedad}
                                </span>
                                <span className="text-[12px] font-bold" style={{ color: color.text }}>{c.score}%</span>
                              </div>
                              <div className="h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "white" }}>
                                <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: color.bar }} />
                              </div>
                              {c.factores.map((f) => (
                                <div key={f.criterio} className="text-[11px] flex items-start gap-1" style={{ color: "var(--text-secondary)" }}>
                                  <span>{NIVEL_ICONO[f.nivel]}</span>
                                  <span>{f.mensaje.replace(/^[✅⚠️ℹ️]+\s*/, "")}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          ))}

          {(isLoading || cargandoRecomendacion) && (
            <div className="flex justify-start">
              <div
                className="rounded-2xl px-4 py-3 flex items-center gap-1"
                style={{ background: "white", border: "1px solid var(--border-subtle)", borderTopLeftRadius: 4 }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: "var(--color-brand)", animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Barra de entrada (pegada justo encima del nav inferior fijo) ── */}
      <div
        className="sticky px-4 py-3"
        style={{ bottom: 84, borderTop: "1px solid var(--border-subtle)", background: "white" }}
      >
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1 text-[11px] mb-2 ml-auto"
            style={{ color: "var(--text-muted)" }}
          >
            <RotateCcw size={11} /> Nueva consulta
          </button>
        )}

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

        {(imagenAdjunta || comprimiendoImagen) && (
          <div className="mb-2 p-2.5 rounded-xl flex items-start gap-2.5" style={{ background: "var(--surface-page)", border: "1px solid var(--border-subtle)" }}>
            {comprimiendoImagen ? (
              <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center flex-shrink-0 text-[11px]" style={{ color: "var(--text-muted)" }}>...</div>
            ) : (
              <div className="relative flex-shrink-0">
                <img src={imagenAdjunta!} alt="Foto a analizar" className="w-14 h-14 rounded-xl object-cover" />
                <button
                  onClick={() => setImagenAdjunta(null)}
                  aria-label="Quitar foto"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white"
                  style={{ background: "var(--color-negative)" }}
                >
                  <X size={11} />
                </button>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] mb-1" style={{ color: "var(--text-muted)" }}>¿Sobre qué cultivo es esta foto?</p>
              {cargandoCultivos ? (
                <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>Cargando tus cultivos...</p>
              ) : (
                <select
                  value={cultivoSeleccionado}
                  onChange={(e) => setCultivoSeleccionado(e.target.value)}
                  className="w-full h-9 px-2.5 rounded-lg text-[12.5px]"
                  style={{ border: "1px solid var(--border-default)" }}
                >
                  <option value="">Selecciona un cultivo</option>
                  {cultivos.map((c) => (
                    <option key={c.id} value={c.id}>{`${c.especie} ${c.variedad ?? ""} — ${c.lote.nombre}`.trim()}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => setMostrarGrabadora((v) => !v)}
            disabled={isLoading}
            aria-label="Grabar nota de voz"
            className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={mostrarGrabadora ? { background: "var(--color-brand-bg)", color: "var(--color-brand-dark)" } : { background: "var(--surface-page)", color: "var(--text-muted)" }}
          >
            <Mic size={17} />
          </button>

          {/* Ícono de adjuntar foto junto al micrófono — el usuario pidió
              explícitamente no quitarlo al agregar el banner "Asistente de
              cultivos"; ambos disparan el mismo par de <input type="file">
              ocultos, con su propio estado de popover (mostrarMenuImagen)
              para no interferir con el menú en línea del banner. */}
          <div className="relative flex-shrink-0" ref={adjuntarMenuRef}>
            <button
              type="button"
              onClick={() => setMostrarMenuImagen((v) => !v)}
              disabled={isLoading || comprimiendoImagen}
              aria-label="Adjuntar foto para diagnóstico"
              className="h-11 w-11 rounded-full flex items-center justify-center"
              style={mostrarMenuImagen ? { background: "var(--color-brand-bg)", color: "var(--color-brand-dark)" } : { background: "var(--surface-page)", color: "var(--text-muted)" }}
            >
              <ImageIcon size={17} />
            </button>

            {mostrarMenuImagen && (
              // Bug real encontrado en producción (2026-08-15, hallazgo del
              // usuario: "en modo móvil no hace nada al tomar foto/galería,
              // en escritorio sí funciona"): estas dos <label> tenían un
              // onClick que cerraba el popover (setMostrarMenuImagen(false))
              // en el mismo tap que debía abrir el selector nativo de
              // archivos. Al desmontarse el <label> por el re-render de
              // React ANTES de que el navegador completara su acción por
              // default (reenviar el click al <input> asociado vía
              // htmlFor), esa acción por default nunca terminaba — el
              // selector nativo nunca se abría. Confirmado con un tap real
              // vía Playwright: el evento "filechooser" nunca se disparaba.
              // ChatInterface.tsx (escritorio, sin este bug) nunca tuvo ese
              // onClick — el popover ya se cierra solo, sin él, en cuanto
              // el usuario elige o cancela una foto (ver
              // handleAdjuntarImagen, primera línea). No agregar de vuelta.
              <div className="absolute bottom-full left-0 mb-2 w-44 rounded-xl shadow-lg py-1 z-10" style={{ background: "white", border: "1px solid var(--border-default)" }}>
                <label
                  htmlFor={camaraInputId}
                  className="flex items-center gap-2 px-3 py-2.5 text-[13px] cursor-pointer"
                  style={{ color: "var(--text-primary)" }}
                >
                  <Camera size={15} /> Tomar foto
                </label>
                <label
                  htmlFor={galeriaInputId}
                  className="flex items-center gap-2 px-3 py-2.5 text-[13px] cursor-pointer"
                  style={{ color: "var(--text-primary)" }}
                >
                  <ImageIcon size={15} /> Galería
                </label>
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={imagenAdjunta ? "Agrega una nota (opcional)..." : "Escribe o dicta tu pregunta..."}
            disabled={isLoading}
            className="flex-1 h-11 px-3.5 rounded-full text-[13px]"
            style={{ background: "var(--surface-page)", border: "1px solid var(--border-default)" }}
          />

          <button
            type="submit"
            disabled={(imagenAdjunta ? !cultivoSeleccionado : !input.trim()) || isLoading}
            aria-label="Enviar"
            className="h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50"
            style={{ background: "var(--color-brand)", color: "white" }}
          >
            <Send size={16} />
          </button>
        </form>

        <p className="text-[10.5px] text-center mt-2" style={{ color: "var(--text-muted)" }}>
          AgroIA puede cometer errores. Consulta siempre con un agrónomo certificado.
        </p>
      </div>
    </div>
  );
}
