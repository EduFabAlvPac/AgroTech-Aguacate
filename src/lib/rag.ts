import { knowledgeBase, type KnowledgeChunk, type Category } from "./knowledge/base";

// ── Scoring weights ────────────────────────────────────────────────────────────
const KEYWORD_MATCH_SCORE = 2;
const SUBCATEGORY_MATCH_SCORE = 3;
const CATEGORY_MATCH_SCORE = 1;

// Keywords that map to categories to widen the search
const CATEGORY_TRIGGERS: Record<string, Category[]> = {
  "plaga": ["plagas"],
  "enfermedad": ["plagas"],
  "hongo": ["plagas"],
  "insecto": ["plagas"],
  "virus": ["plagas"],
  "bacteria": ["plagas"],
  "riego": ["riego"],
  "agua": ["riego", "clima"],
  "lluvia": ["riego", "clima"],
  "sequia": ["riego", "clima"],
  "humedad": ["riego", "clima"],
  "fertiliz": ["nutricion"],
  "abono": ["nutricion"],
  "nutricion": ["nutricion"],
  "macronutriente": ["nutricion"],
  "micronutriente": ["nutricion"],
  "zinc": ["nutricion"],
  "boro": ["nutricion"],
  "calcio": ["nutricion"],
  "temperatura": ["clima"],
  "helada": ["clima", "riego"],
  "clima": ["clima"],
  "viento": ["clima"],
  "frio": ["clima", "riego"],
  "siembra": ["etapas"],
  "plantar": ["etapas"],
  "trasplante": ["etapas"],
  "poda": ["etapas"],
  "maleza": ["agronomia"],
  "arvense": ["agronomia"],
  "cobertura": ["agronomia"],
  "cosecha": ["cosecha"],
  "corte": ["cosecha"],
  "madurez": ["cosecha"],
  "costo": ["financiero"],
  "precio": ["financiero"],
  "presupuesto": ["financiero"],
  "inversion": ["financiero"],
};

// ── Main retrieval function ────────────────────────────────────────────────────

export type RagResult = {
  chunk: KnowledgeChunk;
  score: number;
};

export function retrieveContext(
  query: string,
  maxChunks = 3
): KnowledgeChunk[] {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Find triggered categories
  const triggeredCategories = new Set<Category>();
  for (const [trigger, categories] of Object.entries(CATEGORY_TRIGGERS)) {
    if (q.includes(trigger)) {
      categories.forEach((c) => triggeredCategories.add(c));
    }
  }

  // Score each chunk
  const scored: RagResult[] = knowledgeBase.map((chunk) => {
    let score = 0;

    // Keyword matches (most important)
    for (const kw of chunk.keywords) {
      const kwNorm = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (q.includes(kwNorm)) {
        score += KEYWORD_MATCH_SCORE;
      }
      // Partial word match (e.g. "antracno" matches "antracnosis")
      if (kwNorm.length > 4 && q.includes(kwNorm.slice(0, -2))) {
        score += 1;
      }
    }

    // Subcategory match
    const subNorm = chunk.subcategory.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (q.includes(subNorm)) {
      score += SUBCATEGORY_MATCH_SCORE;
    }

    // Category triggered
    if (triggeredCategories.has(chunk.category)) {
      score += CATEGORY_MATCH_SCORE;
    }

    // Title word matches
    const titleWords = chunk.title.toLowerCase().split(/\s+/);
    for (const word of titleWords) {
      const wNorm = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (wNorm.length > 4 && q.includes(wNorm)) {
        score += 1.5;
      }
    }

    return { chunk, score };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxChunks)
    .map((r) => r.chunk);
}

// ── Context formatter for system prompt injection ──────────────────────────────

export function formatContextForPrompt(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return "";

  const sections = chunks.map((c) =>
    `### ${c.title}\n${c.content}`
  );

  return `\n\n---\nCONTEXTO TÉCNICO RELEVANTE (base de conocimiento AgroTech):\n\n${sections.join("\n\n")}\n---`;
}

// ── Farm context builder ───────────────────────────────────────────────────────

export type FarmContextData = {
  fincaNombre?: string;
  municipio?: string;
  totalHa?: number;
  lotes?: { nombre: string; altitud?: number; areaHa: number }[];
  cultivos?: {
    variedad?: string;
    etapa?: string;
    fechaSiembra?: Date | null;
    cantidadPlantas?: number | null;
  }[];
  alertasActivas?: { titulo: string; tipo: string }[];
};

export function buildFarmContextString(data: FarmContextData): string {
  if (!data.fincaNombre) return "";

  const loteInfo = data.lotes
    ?.map(
      (l) =>
        `${l.nombre}: ${l.areaHa} ha${l.altitud ? ` a ${l.altitud.toLocaleString()} msnm` : ""}`
    )
    .join("; ") ?? "no definidos";

  const cultivoInfo = data.cultivos
    ?.map(
      (c) =>
        `${c.variedad ?? "Hass"} en etapa ${c.etapa ?? "inicial"} (${c.cantidadPlantas ?? 0} plantas)`
    )
    .join("; ") ?? "no definidos";

  const alertInfo =
    data.alertasActivas && data.alertasActivas.length > 0
      ? `\nALERTAS ACTIVAS: ${data.alertasActivas.map((a) => a.titulo).join("; ")}`
      : "";

  return `\nCONTEXTO DE LA FINCA DEL USUARIO:
- Nombre: ${data.fincaNombre}
- Ubicación: ${data.municipio ?? "Norte de Santander"}
- Área total: ${data.totalHa ?? 0} hectáreas
- Lotes: ${loteInfo}
- Cultivos activos: ${cultivoInfo}
- Siembra: ${data.cultivos?.[0]?.fechaSiembra ? new Date(data.cultivos[0].fechaSiembra).toLocaleDateString("es-CO") : "reciente"}${alertInfo}`;
}
