import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { retrieveContext, formatContextForPrompt, buildFarmContextString } from "@/lib/rag";

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
- Prioriza métodos de bajo costo apropiados para pequeños productores`;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const { messages } = await req.json();
    const lastUserMsg = messages[messages.length - 1];
    const userQuery = lastUserMsg?.content ?? "";

    // ── 1. Fetch live farm context ─────────────────────────────────────────
    const [farmData, activeAlerts] = await Promise.all([
      db.finca.findFirst({
        where: { userId: session.user.id },
        include: {
          lotes: {
            include: {
              cultivos: {
                where: { estado: "ACTIVO" },
                select: {
                  variedad: true,
                  etapa: true,
                  fechaSiembra: true,
                  cantidadPlantas: true,
                },
                take: 1,
              },
            },
          },
        },
      }),
      db.alertaClimatica.findMany({
        where: { activa: true, leida: false },
        select: { titulo: true, tipo: true },
        take: 3,
      }),
    ]);

    // ── 2. Build farm context string ───────────────────────────────────────
    const farmContext = buildFarmContextString({
      fincaNombre: farmData?.nombre,
      municipio: farmData?.municipio,
      totalHa: farmData?.lotes.reduce((s, l) => s + l.areaHa, 0),
      lotes: farmData?.lotes.map((l) => ({
        nombre: l.nombre,
        altitud: l.altitud ?? undefined,
        areaHa: l.areaHa,
      })),
      cultivos: farmData?.lotes.flatMap((l) =>
        l.cultivos.map((c) => ({
          variedad: c.variedad,
          etapa: c.etapa,
          fechaSiembra: c.fechaSiembra,
          cantidadPlantas: c.cantidadPlantas,
        }))
      ),
      alertasActivas: activeAlerts,
    });

    // ── 3. RAG retrieval ───────────────────────────────────────────────────
    const ragChunks = retrieveContext(userQuery, 3);
    const ragContext = formatContextForPrompt(ragChunks);

    // ── 4. Build final system prompt ───────────────────────────────────────
    const systemPrompt = `${BASE_SYSTEM_PROMPT}${farmContext}${ragContext}`;

    // ── 5. Save user message (non-blocking) ───────────────────────────────
    if (lastUserMsg?.role === "user") {
      db.chatMessage
        .create({
          data: {
            userId: session.user.id,
            role: "USER",
            content: userQuery,
          },
        })
        .catch(() => {});
    }

    // ── 6. Stream response ─────────────────────────────────────────────────
    const result = await streamText({
      model: anthropic("claude-sonnet-4-6"),
      system: systemPrompt,
      messages,
      maxTokens: 1200,
      onFinish: async ({ text }) => {
        db.chatMessage
          .create({
            data: {
              userId: session.user.id,
              role: "ASSISTANT",
              content: text,
            },
          })
          .catch(() => {});
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("[POST /api/chat]", error);
    return new Response(JSON.stringify({ error: "Error en el asistente IA" }), { status: 500 });
  }
}
