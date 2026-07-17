import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { retrieveContext, formatContextForPrompt } from "@/lib/rag";

export const runtime = "edge";
export const maxDuration = 30;

const BASE_SYSTEM_PROMPT = `Eres AgroIA, un asistente especializado en cultivo de aguacate Hass en Colombia, con enfoque en la región Andina y Norte de Santander entre 1.500 y 2.200 msnm.

TUS COMPETENCIAS:
1. PLAGAS Y ENFERMEDADES: Antracnosis, trips, ácaros, Phytophthora cinnamomi, barrenador, nematodos, roña, cercospora. Diagnóstico por síntomas, ciclos y tratamientos con productos disponibles en Colombia.
2. RIEGO Y NUTRICIÓN: Requerimientos hídricos por etapa, fertilización (8-20-20 en establecimiento, 15-15-15 en crecimiento), análisis foliar, micronutrientes (Zn, B, Ca, Mn).
3. MANEJO AGRONÓMICO: Podas de formación, control de malezas, coberturas, sombrío temporal, distancias de siembra.
4. CLIMA: Manejo de heladas (riego nocturno, coberturas), lluvias excesivas, sequías, adaptación a variabilidad climática andina.
5. BPA Y COMERCIALIZACIÓN: Buenas Prácticas Agrícolas para mercado local colombiano, poscosecha, índices de corte.
6. COSTOS Y PROYECCIONES: Precios COP colombianos, jornales, proyecciones de producción Hass en Colombia.

REGLAS DE RESPUESTA:
- Responde siempre en español colombiano, práctico y directo
- Da cantidades CONCRETAS: kilos, litros, galones, jornales, pesos COP
- Menciona marcas comerciales disponibles en Colombia (Mancozeb 80, Ridomil Gold, Previcur, Fosetil-aluminio, Aliette, Tracer, Vertimec)
- Al detectar síntomas: diagnóstico + tratamiento + prevención
- Máximo 3–4 párrafos salvo que pidan más detalle
- Prioriza métodos de bajo costo apropiados para pequeños productores

`;

const FARM_CONTEXT = `
CONTEXTO DE LA FINCA DEL USUARIO:
- Nombre: Finca Álvarez Pacheco
- Ubicación: Norte de Santander, Colombia
- Área total: 2 hectáreas
- Lote A: 1 ha, 1.850 msnm, Aguacate Hass, etapa Siembra
- Lote B: 1 ha, 1.820 msnm, Aguacate Hass, etapa Siembra
- Siembra: julio 2026, 320 plantas totales (160/lote, distancia 8x8m)
- Portainjerto: Criollo antillano
- Clima: Tropical de montaña, 18-24°C promedio, lluvias bimodales

`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userQuery = messages[messages.length - 1]?.content ?? "";

    // RAG retrieval — knowledge base sobre aguacate Hass
    const ragChunks = retrieveContext(userQuery, 3);
    const ragContext = formatContextForPrompt(ragChunks);

    const systemPrompt = BASE_SYSTEM_PROMPT + FARM_CONTEXT + ragContext;

    const result = await streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: systemPrompt,
      messages,
      maxTokens: 800,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("[POST /api/chat]", error);
    return new Response(
      JSON.stringify({ error: "Error en el asistente IA" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
