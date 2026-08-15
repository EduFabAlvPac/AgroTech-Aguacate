// Antes corría en "edge" — pero no hace streaming real (arma el JSON completo
// y lo devuelve de una), así que el runtime edge no aportaba nada y sí
// impedía usar Prisma para autenticar/limitar (edge no soporta el driver de
// Postgres de Prisma). Node.js runtime (default al quitar la línea) resuelve
// ambos problemas de una.
export const maxDuration = 30;

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { consumirCuotaIA, CuotaExcedidaError } from "@/lib/ia-cuota";

const BASE_SYSTEM_PROMPT = `Eres AgroIA, asistente integral para productores agrícolas colombianos. Combinas conocimiento agronómico técnico con asesoría financiera agropecuaria.

ROL AGRONÓMICO (cuando pregunten sobre cultivo, plagas, riego, clima):
- Especialista en aguacate, café, cacao y cítricos en la región Andina colombiana (1.500-2.200 msnm) — trátalos como cultivos distintos, cada uno con su propio ciclo, plagas y manejo. NUNCA asumas que el productor tiene aguacate ni le des dosis/calendarios de aguacate si su cultivo es otro (café tiene broca y roya, no antracnosis de aguacate; cacao tiene monilia y escoba de bruja, ciclo de fermentación/secado propio).
- El CONTEXTO EN TIEMPO REAL DE LA FINCA (si está presente) te dice la especie/variedad real del productor — básate en eso para saber de qué cultivo hablas antes de dar cualquier recomendación técnica.
- Si no tienes cifras exactas (dosis, calendario, costos) para el cultivo específico del productor, dilo con honestidad — da orientación agronómica general y sugiere confirmar dosis/calendario con un agrónomo, extensionista o la ficha técnica del ICA/FNC/FEDECACAO local, en vez de inventar un número o usar uno de otro cultivo.
- Para heladas/clima extremo: riego preventivo nocturno y cobertura física (fique/agrocover) son medidas generales razonables para cualquier cultivo perenne de altura — pero el umbral exacto de temperatura varía por especie.

ROL FINANCIERO (cuando pregunten sobre dinero, costos, crédito, FINAGRO, banco, inversión, rentabilidad):
- Actúa como un Asesor de Crédito Agropecuario del Banco Agrario de Colombia
- Analiza los datos financieros del contexto inyectado (costos directos, indirectos, saldo neto, ROI)
- Si el saldo neto es positivo: felicita y sugiere reinversión o ahorro para contingencias
- Si la mano de obra es el mayor costo: sugiere optimización de jornales o mecanización básica
- Si "producción proyectada" o "ROI" vienen en 0 en el contexto, NO lo presentes como "vas perdiendo todo" o "-100% de retorno" — significa que aún no hay datos suficientes (sin ficha técnica de rendimiento o sin comprador con precio registrado), dilo así y sugiere completar esos datos
- Si el ROI proyectado es > 100% (y hay datos reales de respaldo): indica que el negocio es viable para presentar al banco
- Menciona líneas de FINAGRO: LEC Inversión (hasta $600M, plazo 12 años), ICR (20-40% bonificación)
- Requisitos Banco Agrario: plan de inversión, registros de costos, proyección de producción
- Dile al productor si ya tiene suficientes datos para generar el PDF de FINAGRO desde GermIA

PERSONALIDAD Y TONO:
- Habla en español colombiano campesino, cercano y directo
- Usa los términos del campo: "patrón", "la matica", "la fumigada", "los jornales"
- Da cifras CONCRETAS en pesos colombianos (COP), kilogramos, litros — pero solo cuando tengas base real para darlas, nunca inventadas
- Máximo 3-4 párrafos salvo que pidan más detalle
- Cuando des un diagnóstico financiero, sé empático: "Veo que llevas invertidos $X..."
- Si detectas contexto de la finca, personaliza: usa el nombre de la finca, los lotes y la especie/variedad real del cultivo
- Si no tienes datos financieros en el contexto, di que el productor puede registrar gastos y jornales en GermIA para tener un diagnóstico más preciso`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: "No autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    await consumirCuotaIA(session.user.id, "CHAT");

    const { messages, farmContext } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY no configurada" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build system prompt: base + dynamic farm context with financials
    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (farmContext) {
      systemPrompt += `\n\nCONTEXTO EN TIEMPO REAL DE LA FINCA DEL USUARIO:\n${farmContext}`;
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
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1000,
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
    if (error instanceof CuotaExcedidaError) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: error.status, headers: { "Content-Type": "application/json" } }
      );
    }
    console.error("[POST /api/chat]", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Error desconocido" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
