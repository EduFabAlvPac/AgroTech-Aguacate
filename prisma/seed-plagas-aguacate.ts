/**
 * Siembra PlagaEnfermedad con umbralAlerta real para la ficha técnica de
 * Aguacate Hass — trips, ácaros y antracnosis, las tres plagas típicas
 * nombradas explícitamente en CLAUDE.md §4. Sin esto, `generatePlagaAlerts`
 * (src/lib/alert-engine.ts) nunca dispara alertas de fumigación/plaga para
 * ningún cultivo — el catálogo estaba vacío en las 5 fichas sembradas,
 * incluyendo esta.
 *
 * Trips y ácaros son plagas de clima SECO (usan humedadMaxPct/lluviaMaxMm,
 * agregados a UmbralAlertaPlaga junto con este seed — antes el tipo solo
 * modelaba condiciones húmedas). Antracnosis es la enfermedad fúngica
 * clásica de clima húmedo (humedadMinPct/lluviaMinMm).
 *
 * Idempotente: borra las plagas existentes de esta ficha antes de volver a
 * crearlas.
 */
import { PrismaClient, TipoPlagaEnfermedad } from "@prisma/client";
import type { UmbralAlertaPlaga } from "../src/lib/fichas-tecnicas";

const db = new PrismaClient();

const PLAGAS: {
  nombre: string;
  tipo: TipoPlagaEnfermedad;
  sintomas: string;
  umbralAlerta: UmbralAlertaPlaga;
  manejoRecomendado: string;
  etapasSusceptibles: number[]; // orden de EtapaFenologica (ver seed-especies.ts)
}[] = [
  {
    nombre: "Trips",
    tipo: "PLAGA",
    sintomas: "Manchas plateadas o bronceadas en hojas y frutos jóvenes, deformación de brotes nuevos.",
    // Prosperan en clima cálido y seco — sin lluvia reciente.
    umbralAlerta: { tempMinC: 24, lluviaMaxMm: 2 },
    manejoRecomendado: "Control biológico con enemigos naturales (crisopas, ácaros depredadores) o insecticida específico solo si la infestación es alta. Evitar productos de amplio espectro que eliminen a los controladores naturales.",
    etapasSusceptibles: [3, 4, 5], // ESTABLECIMIENTO, CRECIMIENTO, PRODUCCION — hojas nuevas y fruto en desarrollo
  },
  {
    nombre: "Ácaros",
    tipo: "PLAGA",
    sintomas: "Punteado amarillento en el envés de las hojas, telarañas finas, hojas bronceadas o deformes.",
    // Igual que trips, favorecidos por calor y baja humedad.
    umbralAlerta: { tempMinC: 26, humedadMaxPct: 60 },
    manejoRecomendado: "Riego por aspersión foliar para elevar la humedad ambiental (los ácaros prosperan en sequía) o acaricida específico si el daño ya es visible en varias hojas.",
    etapasSusceptibles: [3, 4, 5],
  },
  {
    nombre: "Antracnosis",
    tipo: "ENFERMEDAD",
    sintomas: "Manchas oscuras hundidas en frutos maduros, lesiones necróticas en hojas y ramas jóvenes.",
    // Hongo Colletotrichum — favorecido por humedad alta y lluvia.
    umbralAlerta: { humedadMinPct: 80, lluviaMinMm: 10 },
    manejoRecomendado: "Podas de sanidad para mejorar ventilación de la copa, aplicación preventiva de fungicida cúprico antes de la temporada de lluvias, evitar riego por aspersión que moje el follaje.",
    etapasSusceptibles: [2, 3, 4, 5, 6], // vulnerable desde siembra hasta cosecha, especialmente en establecimiento
  },
];

async function main() {
  const ficha = await db.fichaTecnica.findFirst({
    where: { variedad: { especie: { slug: "aguacate" }, nombre: "Hass" } },
  });
  if (!ficha) throw new Error("No se encontró la ficha técnica de Aguacate Hass");

  await db.plagaEnfermedad.deleteMany({ where: { fichaId: ficha.id } });
  await db.plagaEnfermedad.createMany({
    data: PLAGAS.map((p) => ({
      fichaId: ficha.id,
      nombre: p.nombre,
      tipo: p.tipo,
      sintomas: p.sintomas,
      umbralAlerta: p.umbralAlerta as object,
      manejoRecomendado: p.manejoRecomendado,
      etapasSusceptibles: p.etapasSusceptibles,
      imagenesRef: [],
    })),
  });

  console.log(`Aguacate Hass: ${PLAGAS.length} plagas/enfermedades sembradas con umbral climático (${PLAGAS.map((p) => p.nombre).join(", ")}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
