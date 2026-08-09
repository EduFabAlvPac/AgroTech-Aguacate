/**
 * Diagnóstico de plagas/enfermedades por imagen (RF15) — ver CLAUDE.md §3 y
 * docs/REQUERIMIENTOS.md §4.5/§1.3. Prioridad crítica de negocio.
 *
 * Usa el mismo GROQ_API_KEY que el asistente conversacional
 * (src/app/api/chat/route.ts), pero un modelo con soporte de visión —
 * confirmado en la documentación de Groq (agosto 2026): `qwen/qwen3.6-27b`,
 * hasta 5 imágenes de 20MB c/u, acepta `data:` URI en base64 directo.
 *
 * El diagnóstico es específico al cultivo/variedad activo: si el Cultivo
 * tiene una FichaTecnica pinneada (ver src/lib/fichas-tecnicas.ts), su
 * catálogo PlagaEnfermedad se inyecta en el prompt — el modelo prioriza esas
 * plagas conocidas sobre su conocimiento genérico. Esto es lo que evita el
 * riesgo de alucinación en café/cacao señalado en REQUERIMIENTOS.md §1.3
 * (el RAG de texto del chat sigue siendo solo-aguacate; este flujo no
 * depende de él en absoluto).
 */

const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.6-27b";

export interface PlagaCatalogo {
  nombre: string;
  tipo: string;
  sintomas: string | null;
  manejoRecomendado: string | null;
}

export interface DiagnosticoResultado {
  diagnostico: string;
  confianza: "alta" | "media" | "baja";
  sintomasObservados: string;
  recomendacion: string;
  coincideCatalogo: boolean;
  /** Razonamiento del modelo (diagnóstico diferencial) — separado de la
   * respuesta final vía `reasoning_format: "parsed"` (ver diagnosticarImagen).
   * Opcional: informativo para el productor, no crítico para el flujo. */
  razonamiento?: string;
}

export class DiagnosticoError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "DiagnosticoError";
    this.status = status;
  }
}

function construirPrompt(especie: string, variedad: string, catalogo: PlagaCatalogo[]): string {
  const listaCatalogo = catalogo.length
    ? catalogo
        .map((p) => `- ${p.nombre} (${p.tipo})${p.sintomas ? `: ${p.sintomas}` : ""}${p.manejoRecomendado ? ` · Manejo: ${p.manejoRecomendado}` : ""}`)
        .join("\n")
    : "(sin catálogo específico registrado todavía para esta variedad — usa tu conocimiento agronómico general, pero dilo en la respuesta)";

  return `Eres un agrónomo experto en diagnóstico de plagas, enfermedades y deficiencias nutricionales por imagen, especializado en ${especie} ${variedad}. Nunca uses conocimiento de otros cultivos (ej. no confundas plagas de café con las de aguacate o cacao).

Antes de responder, considera y descarta activamente los diagnósticos diferenciales más parecidos (plagas/enfermedades/deficiencias que producen síntomas similares) — pero en tu respuesta final da UN SOLO diagnóstico concluyente, el más probable, no una lista de posibilidades.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, con exactamente esta forma:
{
  "diagnostico": "nombre concreto y único de la plaga/enfermedad/deficiencia detectada, o 'Sin evidencia de daño visible' si la planta se ve sana",
  "confianza": "alta" | "media" | "baja",
  "sintomasObservados": "descripción breve y concreta de lo que ves en la imagen (color, patrón, ubicación en la planta)",
  "recomendacion": "manejo recomendado en español colombiano campesino — SIEMPRE incluye: 1) producto/ingrediente activo concreto y dosis, 2) frecuencia de aplicación, 3) una medida cultural/preventiva adicional (poda, drenaje, distanciamiento, etc.)",
  "coincideCatalogo": true o false
}

Catálogo de plagas/enfermedades conocidas para ${especie} ${variedad}:
${listaCatalogo}

Si lo que ves coincide con algo del catálogo, usa exactamente ese nombre en "diagnostico", basa "recomendacion" en su manejo recomendado (amplíalo con dosis/frecuencia concretas aunque el catálogo no las tenga), y pon coincideCatalogo=true. Si no coincide con el catálogo pero lo reconoces por tu conocimiento general, responde igual pero con coincideCatalogo=false. Si la imagen no permite diagnosticar (no es una planta, está borrosa, muy poca evidencia visible, etc.), dilo claramente en "diagnostico" con confianza "baja" y en "recomendacion" pide una foto más clara o de otro ángulo en vez de inventar un tratamiento.`;
}

/**
 * Llama al modelo de visión de Groq y devuelve el diagnóstico ya parseado.
 * `imagenDataUri` debe ser un data: URI base64 (ej. el que produce
 * PhotoCapture.tsx — ya viene comprimido a ~800px/70% calidad).
 */
export async function diagnosticarImagen(
  imagenDataUri: string,
  especie: string,
  variedad: string,
  catalogo: PlagaCatalogo[],
  descripcionUsuario?: string
): Promise<DiagnosticoResultado> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new DiagnosticoError("GROQ_API_KEY no configurada", 500);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `${construirPrompt(especie, variedad, catalogo)}\n\n${descripcionUsuario ? `Nota del productor: ${descripcionUsuario}` : ""}` },
            { type: "image_url", image_url: { url: imagenDataUri } },
          ],
        },
      ],
      // qwen3.6-27b es un modelo "thinking". Con reasoning_effort:"default"
      // (aunque separado vía reasoning_format:"parsed") se observaron DOS
      // fallas reales en producción: 1) el razonamiento se comía max_tokens
      // antes de llegar al JSON, 2) incluso separado, el razonamiento seguía
      // consumiendo casi todo el presupuesto y `content` llegaba vacío.
      // reasoning_effort:"none" desactiva el pensamiento por completo —
      // menos "profundidad" de diagnóstico diferencial, pero confiable, que
      // es lo que importa para un flujo de campo. Ver
      // https://console.groq.com/docs/reasoning.
      reasoning_effort: "none",
      max_tokens: 1200,
      temperature: 0.3,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new DiagnosticoError(data.error?.message || "Error del servicio de diagnóstico IA", 502);
  }

  const mensaje = data.choices?.[0]?.message ?? {};
  const resultado = parsearRespuesta(mensaje.content ?? "");
  if (typeof mensaje.reasoning === "string" && mensaje.reasoning.trim()) {
    resultado.razonamiento = mensaje.reasoning.trim();
  }
  return resultado;
}

/**
 * El modelo debería responder JSON puro, pero se parsea de forma defensiva
 * (algunos modelos envuelven la respuesta en texto o ```json``` pese a la
 * instrucción) — nunca se le pide al usuario que confíe en un 500 por un
 * formato inesperado si se puede rescatar el diagnóstico igual.
 */
function parsearRespuesta(textoOriginal: string): DiagnosticoResultado {
  // Red de seguridad adicional a reasoning_format:"parsed" — si algún modelo
  // futuro igual mezcla el pensamiento en `content`, no debe filtrarse al
  // diagnóstico final.
  const texto = textoOriginal.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const match = texto.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (typeof parsed.diagnostico === "string") {
        return {
          diagnostico: parsed.diagnostico,
          confianza: ["alta", "media", "baja"].includes(parsed.confianza) ? parsed.confianza : "media",
          sintomasObservados: parsed.sintomasObservados ?? "",
          recomendacion: parsed.recomendacion ?? "Consulta con un agrónomo local para confirmar el manejo.",
          coincideCatalogo: !!parsed.coincideCatalogo,
        };
      }
    } catch {
      // sigue al fallback de abajo
    }
  }

  // Fallback: el modelo no devolvió JSON válido — se conserva el texto crudo
  // como diagnóstico en vez de fallar toda la operación.
  return {
    diagnostico: texto.trim() || "No se pudo interpretar la respuesta del modelo",
    confianza: "baja",
    sintomasObservados: "",
    recomendacion: "La respuesta del modelo no tuvo el formato esperado — verifica manualmente o intenta de nuevo con otra foto.",
    coincideCatalogo: false,
  };
}
