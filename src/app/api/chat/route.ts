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
  try {
    const { messages } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY no configurada" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message || "Error Groq API" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const text = data.choices?.[0]?.message?.content || "Sin respuesta";

    return new Response(
      JSON.stringify({ content: text }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Error desconocido" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}