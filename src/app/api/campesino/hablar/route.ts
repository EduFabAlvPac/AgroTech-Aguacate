export const maxDuration = 30;

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { consumirCuotaIA, CuotaExcedidaError } from "@/lib/ia-cuota";
import { verificarLimite, RateLimitError } from "@/lib/rate-limit";

/**
 * "Hablar con GermIAmigo" — endpoint de texto dedicado, NO reutiliza
 * /api/chat/route.ts: la respuesta se lee en voz alta con speechSynthesis
 * (ver HablarGermIAmigoClient.tsx), así que el prompt exige frases cortas y
 * sin markdown/listas ("- item" leído literal suena mal) — un prompt
 * distinto al de AgroIA (modo completo/simple), que sí espera leerse en
 * pantalla. Se crea aparte para no arriesgar el prompt ya afinado del
 * asistente de escritorio.
 */
const SYSTEM_PROMPT = `Eres GermIAmigo, un amigo campesino que da consejos agrícolas por voz a productores de café, cacao, aguacate y cítricos en Colombia.

Reglas de estilo (tu respuesta se lee en voz alta, no se muestra escrita):
- Habla en español colombiano campesino, cercano, como si estuvieras hablando por teléfono con un amigo.
- Frases cortas y simples. NUNCA uses listas, viñetas, markdown, símbolos, ni números de pasos — todo en prosa corrida, como si lo dijeras hablando.
- Máximo 2-3 frases por respuesta, salvo que te pidan más detalle.
- Si no sabes algo con certeza, dilo con honestidad y sugiere preguntarle a un asesor o técnico agrícola de confianza — nunca inventes una dosis o un dato técnico.
- Si preguntan sobre plagas o enfermedades, puedes orientar en general, pero recuerda que para un diagnóstico preciso lo mejor es tomar una foto en la sección de Diagnóstico de la app.`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }
    await verificarLimite("ia", session.user.id);
    await consumirCuotaIA(session.user.id, "CHAT");

    const { texto, historial } = await req.json();
    if (!texto || typeof texto !== "string") {
      return Response.json({ error: "Falta el texto del mensaje" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "GROQ_API_KEY no configurada" }, { status: 500 });
    }

    // Historial acotado (últimos turnos de esta misma "llamada", no
    // persistido en BD) — solo para que la conversación tenga continuidad
    // dentro de la sesión, no para guardar nada.
    const mensajesPrevios = Array.isArray(historial) ? historial.slice(-6) : [];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        // llama-3.1-8b-instant fue retirado por Groq el 16 de agosto de 2026
        // para cuentas gratis/developer (ver console.groq.com/docs/deprecations)
        // — openai/gpt-oss-20b es el reemplazo oficial que ellos recomiendan.
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...mensajesPrevios,
          { role: "user", content: texto },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data.error?.message || "Error Groq API" }, { status: 500 });
    }

    const respuesta = data.choices?.[0]?.message?.content || "No te escuché bien, ¿me puedes repetir?";
    return Response.json({ data: { respuesta } });
  } catch (error) {
    if (error instanceof CuotaExcedidaError || error instanceof RateLimitError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("[POST /api/campesino/hablar]", error);
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
