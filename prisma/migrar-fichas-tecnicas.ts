/**
 * Migración de datos de Fase 1 (motor de fichas técnicas) — ver CLAUDE.md §2.2
 * y docs/REQUERIMIENTOS.md §4.2 / ADR-002.
 *
 * Cada EspecieCultivo sembrada en prisma/seed-especies.ts ya representa una
 * combinación especie+variedad (ej. "Aguacate Hass"). Este script, por cada
 * una:
 *   1. Crea 1 Variedad (nombre de la variedad, ej. "Hass").
 *   2. Crea 1 FichaTecnica v1 PUBLICADA con los campos numéricos migrados.
 *   3. Crea sus EtapaFenologica a partir del array `etapas` (sin duración ni
 *      calendario/nutrición/riego/plagas — eso lo completa el Super Admin
 *      desde el panel de administración de fichas técnicas, aún no construido).
 *   4. Vincula los Cultivo existentes que ya usaban esa EspecieCultivo
 *      (vía especieId) a la Variedad y FichaTecnica recién creadas.
 *
 * Idempotente: una EspecieCultivo que ya tiene Variedad se omite.
 *
 * Uso: npx tsx prisma/migrar-fichas-tecnicas.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Mapa especie→variedad para las 4 EspecieCultivo conocidas de
 * prisma/seed-especies.ts. Es intencionalmente explícito (no un split
 * genérico del slug) porque "cacao-ccu51" y similares no siguen un patrón
 * separable de forma confiable.
 */
const NOMBRE_VARIEDAD: Record<string, { nombreVariedad: string; slugVariedad: string }> = {
  "aguacate-hass": { nombreVariedad: "Hass", slugVariedad: "hass" },
  "cafe-caturra": { nombreVariedad: "Caturra", slugVariedad: "caturra" },
  "cacao-ccu51": { nombreVariedad: "CCN-51", slugVariedad: "ccn-51" },
  "limon-tahiti": { nombreVariedad: "Tahití", slugVariedad: "tahiti" },
};

async function main() {
  console.log("🧾 Migración a motor de fichas técnicas — Fase 1");

  const especies = await prisma.especieCultivo.findMany({
    where: { variedades: { none: {} } },
  });

  if (especies.length === 0) {
    console.log("✅ Todas las especies ya tienen Variedad/FichaTecnica. Nada que hacer.");
    return;
  }

  console.log(`Encontradas ${especies.length} especie(s) sin migrar.`);

  for (const especie of especies) {
    const mapeo = NOMBRE_VARIEDAD[especie.slug];
    if (!mapeo) {
      console.warn(`  ⚠️  ${especie.slug}: sin mapeo de variedad conocido, se omite (agrégalo al script).`);
      continue;
    }

    const etapas = Array.isArray(especie.etapas) ? (especie.etapas as string[]) : [];

    await prisma.$transaction(async (tx) => {
      const variedad = await tx.variedad.create({
        data: {
          especieId: especie.id,
          nombre: mapeo.nombreVariedad,
          slug: mapeo.slugVariedad,
        },
      });

      const ficha = await tx.fichaTecnica.create({
        data: {
          variedadId: variedad.id,
          version: 1,
          estado: "PUBLICADA",
          publicadaEn: new Date(),
          notasVersion: `Migrada automáticamente desde especies_cultivo.${especie.slug}`,
          altitudMinM: especie.altitudMin,
          altitudMaxM: especie.altitudMax,
          tempMinC: especie.tempOptMin,
          tempMaxC: especie.tempOptMax,
          precipitacionAnualMinMm: especie.precipAnualMin ? Math.round(especie.precipAnualMin) : null,
          precipitacionAnualMaxMm: especie.precipAnualMax ? Math.round(especie.precipAnualMax) : null,
          cicloProductivoMeses: especie.cicloMesesPrimeraCosecha,
          etapas: {
            create: etapas.map((nombre, idx) => ({ orden: idx + 1, nombre })),
          },
        },
      });

      // Punto único de la curva de producción con el dato disponible hoy
      // (kg/árbol/año en plena producción) — se amplía con más años desde el
      // panel de administración cuando exista.
      if (especie.produccionKgArbolAnual) {
        await tx.puntoCurvaProduccion.create({
          data: {
            fichaId: ficha.id,
            anioProduccion: especie.cicloMesesPrimeraCosecha
              ? Math.ceil(especie.cicloMesesPrimeraCosecha / 12)
              : 1,
            kgPorPlantaEsperado: especie.produccionKgArbolAnual,
          },
        });
      }

      const { count } = await tx.cultivo.updateMany({
        where: { especieId: especie.id },
        data: { variedadId: variedad.id, fichaTecnicaId: ficha.id },
      });

      console.log(
        `  → ${especie.nombre}: Variedad "${mapeo.slugVariedad}" + FichaTecnica v1 creadas, ${count} cultivo(s) vinculado(s).`
      );
    });
  }

  console.log("✅ Migración completa.");
}

main()
  .catch((error) => {
    console.error("❌ Error en la migración:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
