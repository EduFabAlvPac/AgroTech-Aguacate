/**
 * Seed script for EspecieCultivo table.
 * Run after `npx prisma db push` to populate species catalog
 * and link existing cultivos to their species.
 *
 * Usage: npx tsx prisma/seed-especies.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const ESPECIES = [
  {
    slug: "aguacate-hass",
    nombre: "Aguacate Hass",
    familia: "Lauraceae",
    etapas: ["PREPARACION", "SIEMBRA", "ESTABLECIMIENTO", "CRECIMIENTO", "PRODUCCION", "COSECHA"],
    tiposRegistro: ["SIEMBRA", "RIEGO", "FERTILIZACION", "PODA", "TRATAMIENTO_PLAGAS", "COSECHA", "OBSERVACION", "INSPECCION", "ALERTA"],
    umbralHelada: 12,
    umbralCalor: 32,
    lluviaMaxMm: 30,
    vientoMaxKmh: 40,
    cicloMesesPrimeraCosecha: 24,
    produccionKgArbolAnual: 20,
    altitudMin: 1500,
    altitudMax: 2200,
    tempOptMin: 18,
    tempOptMax: 24,
    precipAnualMin: 900,
    precipAnualMax: 1200,
  },
  {
    slug: "cafe-caturra",
    nombre: "Café Caturra",
    familia: "Rubiaceae",
    etapas: ["PREPARACION", "SIEMBRA", "ESTABLECIMIENTO", "CRECIMIENTO", "FLORACION", "LLENADO", "COSECHA", "BENEFICIO"],
    tiposRegistro: ["SIEMBRA", "RIEGO", "FERTILIZACION", "PODA", "TRATAMIENTO_PLAGAS", "COSECHA", "DESPULPADO", "SECADO", "OBSERVACION"],
    umbralHelada: 5,
    umbralCalor: 30,
    lluviaMaxMm: 40,
    vientoMaxKmh: 50,
    cicloMesesPrimeraCosecha: 18,
    produccionKgArbolAnual: 2.5,
    altitudMin: 1200,
    altitudMax: 1800,
    tempOptMin: 17,
    tempOptMax: 23,
    precipAnualMin: 1500,
    precipAnualMax: 2500,
  },
  {
    slug: "cacao-ccu51",
    nombre: "Cacao CCN-51",
    familia: "Malvaceae",
    etapas: ["PREPARACION", "SIEMBRA", "ESTABLECIMIENTO", "CRECIMIENTO", "FLORACION", "FRUCTIFICACION", "COSECHA", "FERMENTACION"],
    tiposRegistro: ["SIEMBRA", "RIEGO", "FERTILIZACION", "PODA", "TRATAMIENTO_PLAGAS", "COSECHA", "FERMENTACION", "SECADO", "OBSERVACION"],
    umbralHelada: 15,
    umbralCalor: 35,
    lluviaMaxMm: 50,
    vientoMaxKmh: 45,
    cicloMesesPrimeraCosecha: 30,
    produccionKgArbolAnual: 1.5,
    altitudMin: 200,
    altitudMax: 900,
    tempOptMin: 22,
    tempOptMax: 30,
    precipAnualMin: 1500,
    precipAnualMax: 2500,
  },
  {
    slug: "limon-tahiti",
    nombre: "Limón Tahití",
    familia: "Rutaceae",
    etapas: ["PREPARACION", "SIEMBRA", "ESTABLECIMIENTO", "CRECIMIENTO", "FLORACION", "PRODUCCION", "COSECHA"],
    tiposRegistro: ["SIEMBRA", "RIEGO", "FERTILIZACION", "PODA", "TRATAMIENTO_PLAGAS", "COSECHA", "OBSERVACION", "INSPECCION"],
    umbralHelada: 8,
    umbralCalor: 38,
    lluviaMaxMm: 35,
    vientoMaxKmh: 50,
    cicloMesesPrimeraCosecha: 36,
    produccionKgArbolAnual: 40,
    altitudMin: 0,
    altitudMax: 1600,
    tempOptMin: 20,
    tempOptMax: 30,
    precipAnualMin: 900,
    precipAnualMax: 1800,
  },
];

async function main() {
  console.log("🌱 Seeding EspecieCultivo table...\n");

  for (const especie of ESPECIES) {
    const created = await db.especieCultivo.upsert({
      where: { slug: especie.slug },
      update: especie,
      create: especie,
    });
    console.log(`  ✅ ${created.nombre} (${created.slug})`);
  }

  // ── Link existing cultivos to their species ──────────────────────────────────
  console.log("\n🔗 Linking existing cultivos to EspecieCultivo...");

  const aguacateHass = await db.especieCultivo.findUnique({
    where: { slug: "aguacate-hass" },
  });

  if (aguacateHass) {
    const result = await db.cultivo.updateMany({
      where: {
        especie: { contains: "Aguacate", mode: "insensitive" },
        especieId: null, // Only update those not yet linked
      },
      data: { especieId: aguacateHass.id },
    });
    console.log(`  ✅ ${result.count} cultivos de aguacate vinculados a '${aguacateHass.slug}'`);
  }

  // Link café cultivos if any exist
  const cafe = await db.especieCultivo.findUnique({ where: { slug: "cafe-caturra" } });
  if (cafe) {
    const result = await db.cultivo.updateMany({
      where: {
        especie: { contains: "Café", mode: "insensitive" },
        especieId: null,
      },
      data: { especieId: cafe.id },
    });
    if (result.count > 0) console.log(`  ✅ ${result.count} cultivos de café vinculados`);
  }

  console.log("\n✨ Seed completado exitosamente");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
