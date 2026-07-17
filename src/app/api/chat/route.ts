export const runtime = "edge";
export const maxDuration = 30;

const SYSTEM_PROMPT = `Eres AgroIA, asistente especializado en cultivo de aguacate Hass en Colombia, región Andina y Norte de Santander entre 1.500 y 2.200 msnm.

CONTEXTO DE LA FINCA:
- Finca El Juncal, Ocaña, Norte de Santander, Colombia
- 2 lotes de 1 hectárea cada uno  
- Lote A: 1.850 msnm, Aguacate Hass, etapa Siembra
- Lote B: 1.820 msnm, Aguacate Hass, etapa Siembra
- Siembra: julio 2026, 320 plantas (160/lote, distancia 8x8m)

PLAGAS: Antracnosis: Mancozeb 80% 2.5g/L cada 15 días. Phytophthora: Fosetil-aluminio 2g/L mensual. Trips: Spinosad 0.4mL/L. Ácaros: Abamectina 0.8mL/L.
RIEGO: Semanas 1-4: 3-4L/planta cada 2-3 días. Semanas 5-8: 4-6L/planta cada 3-4 días.
FERTILIZACIÓN: Mes 2: 50g 8-20-20/planta. Mes 4: 100g + 10g Sulfato Zinc. Mes 6: 150g.
HELADAS: Crítico menor 12°C. Riego nocturno 5-8L desde 21h. Cubrir con fique.
COSTOS/ha: Plántulas 800k-1.28M COP. Fertilizantes 300k-450k. Fungicidas 250k-400k. Mano obra 1.5M-2.5M.
REGLAS: Responde en español colombiano, práctico, cantidades concretas en COP/kg/litros. Máximo 3-4 párrafos.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key no configurada" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const googleMessages = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: googleMessages,
          generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Google API error:", err);
      return new Response(
        JSON.stringify({ error: "Error Google API: " + err }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode('0:""\n'));
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                const escaped = JSON.stringify(text);
                controller.enqueue(encoder.encode(`0:${escaped}\n`));
              }
            } catch {}
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Vercel-AI-Data-Stream": "v1",
      },
    });
  } catch (error: any) {
    console.error("[POST /api/chat]", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Error desconocido" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}