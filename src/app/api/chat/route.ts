import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export const runtime = "edge";
export const maxDuration = 30;

const SYSTEM_PROMPT = `Eres AgroIA, asistente especializado en cultivo de aguacate Hass en Colombia, región Andina y Norte de Santander entre 1.500 y 2.200 msnm.

CONTEXTO DE LA FINCA:
- Finca El Juncal, Ocaña, Norte de Santander, Colombia
- 2 lotes de 1 hectárea cada uno
- Lote A: 1.850 msnm, Aguacate Hass, etapa Siembra
- Lote B: 1.820 msnm, Aguacate Hass, etapa Siembra
- Siembra: julio 2026, 320 plantas (160/lote, distancia 8x8m)

CONOCIMIENTO TÉCNICO:
PLAGAS: Antracnosis (Colletotrichum): manchas negras en frutos, controlar con Mancozeb 80% 2.5g/L cada 15 días en época lluviosa. Phytophthora cinnamomi: raíces negras, marchitez, prevenir con buen drenaje y Fosetil-aluminio 2g/L mensual. Trips: deformación de brotes, controlar con Spinosad 0.4mL/L. Ácaros: bronceado en hojas, controlar con Abamectina 0.8mL/L.

RIEGO ESTABLECIMIENTO: Semanas 1-4: 3-4L/planta cada 2-3 días. Semanas 5-8: 4-6L/planta cada 3-4 días. Para 320 plantas: 960-1280L por riego.

FERTILIZACIÓN: Mes 2: 50g de 8-20-20 por planta. Mes 4: 100g por planta + 10g Sulfato de Zinc. Mes 6: 150g por planta. Foliar mensual: Calcio 2g/L + Boro 0.5g/L.

HELADAS: Temperatura crítica menor a 12°C para plántulas. Acción: riego nocturno 5-8L/planta desde las 21h. Cubrir con sacos de fique o agrocover.

COSTOS 2026 por hectárea: Plántulas: 800.000-1.280.000 COP. Fertilizantes año 1: 300.000-450.000 COP. Fungicidas año 1: 250.000-400.000 COP. Mano de obra año 1: 1.500.000-2.500.000 COP. Primera cosecha año 2: 3-5 kg/árbol.

REGLAS: Responde siempre en español colombiano, práctico y directo. Da cantidades concretas en COP, kg, litros. Máximo 3-4 párrafos salvo que pidan más detalle.`;

export async function POST(req: Request) {
  console.log("[chat] Request received");

  try {
    const body = await req.json();
    console.log("[chat] Body parsed, messages:", body.messages?.length);

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    console.log("[chat] GOOGLE_GENERATIVE_AI_API_KEY present:", !!apiKey, "length:", apiKey?.length ?? 0);

    if (!apiKey) {
      console.error("[chat] NO API KEY FOUND. Check Vercel env vars.");
      return new Response(
        JSON.stringify({ error: "GOOGLE_GENERATIVE_AI_API_KEY no configurada en el servidor" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages } = body;

    console.log("[chat] Calling streamText with google('gemini-1.5-flash')...");

    const result = streamText({
      model: google("gemini-1.5-flash"),
      system: SYSTEM_PROMPT,
      messages,
      maxTokens: 800,
    });

    console.log("[chat] streamText called, returning data stream response");

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("[chat] FULL ERROR:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.slice(0, 500),
      cause: error?.cause,
    });

    return new Response(
      JSON.stringify({
        error: "Error en AgroIA: " + (error?.message || "desconocido"),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
