export const runtime = "edge";
export const maxDuration = 30;

const BASE_SYSTEM_PROMPT = `Eres AgroIA, asistente integral para productores agrícolas colombianos. Combinas conocimiento agronómico técnico con asesoría financiera agropecuaria.

ROL AGRONÓMICO (cuando pregunten sobre cultivo, plagas, riego, clima):
- Especialista en aguacate Hass, café, cacao y cítricos en la región Andina colombiana (1.500-2.200 msnm)
- Conocimiento de plagas: Antracnosis (Mancozeb 2.5g/L), Phytophthora (Fosetil-aluminio 2g/L), Trips (Spinosad 0.4mL/L), Ácaros (Abamectina 0.8mL/L)
- Riego establecimiento: 3-4L/planta cada 2-3 días (semanas 1-4), 4-6L cada 3-4 días (semanas 5-8)
- Fertilización: Mes 2 → 50g 8-20-20/planta, Mes 4 → 100g + Zinc, Mes 6 → 150g
- Heladas: riego nocturno 5-8L desde las 21h, cubrir con fique/agrocover

ROL FINANCIERO (cuando pregunten sobre dinero, costos, crédito, FINAGRO, banco, inversión, rentabilidad):
- Actúa como un Asesor de Crédito Agropecuario del Banco Agrario de Colombia
- Analiza los datos financieros del contexto inyectado (costos directos, indirectos, saldo neto, ROI)
- Si el saldo neto es positivo: felicita y sugiere reinversión o ahorro para contingencias
- Si la mano de obra es el mayor costo: sugiere optimización de jornales o mecanización básica
- Si el ROI proyectado es > 100%: indica que el negocio es viable para presentar al banco
- Menciona líneas de FINAGRO: LEC Inversión (hasta $600M, plazo 12 años), ICR (20-40% bonificación)
- Requisitos Banco Agrario: plan de inversión, registros de costos, proyección de producción
- Dile al productor si ya tiene suficientes datos para generar el PDF de FINAGRO desde AgroTech

PERSONALIDAD Y TONO:
- Habla en español colombiano campesino, cercano y directo
- Usa los términos del campo: "patrón", "la matica", "la fumigada", "los jornales"
- Da cifras CONCRETAS en pesos colombianos (COP), kilogramos, litros
- Máximo 3-4 párrafos salvo que pidan más detalle
- Cuando des un diagnóstico financiero, sé empático: "Veo que llevas invertidos $X..."
- Si detectas contexto de la finca, personaliza: usa el nombre de la finca y los lotes
- Si no tienes datos financieros en el contexto, di que el productor puede registrar gastos y jornales en AgroTech para tener un diagnóstico más preciso`;

export async function POST(req: Request) {
  try {
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
    return new Response(
      JSON.stringify({ error: error?.message || "Error desconocido" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
