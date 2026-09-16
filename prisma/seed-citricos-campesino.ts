/**
 * Seed de "Cítricos" genérico — especie nueva para el selector de Diagnóstico
 * del modo Campesino (Café/Cacao/Aguacate/Cítricos, ver mockup validado
 * 2026-08-26). Decisión explícita del usuario: NO reusar "Limón Tahití" (ya
 * sembrado en seed-especies.ts) — se crea una especie/variedad/ficha propia.
 *
 * El catálogo de plagas de abajo es un BORRADOR razonable (plagas/
 * enfermedades más comunes y conocidas de cítricos en Colombia), no una
 * revisión agronómica formal — ver riesgo señalado en el plan. Antes de
 * confiar en él para producción real, debería pasar por el criterio de un
 * agrónomo (persona `agrotech-agronomo` del repo).
 *
 * Idempotente: no crea nada si "citricos-generico" ya existe.
 * Uso: npx tsx prisma/seed-citricos-campesino.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const existente = await db.especieCultivo.findUnique({ where: { slug: "citricos-generico" } });
  if (existente) {
    console.log("✅ 'citricos-generico' ya existe. Nada que hacer.");
    return;
  }

  console.log("🍊 Sembrando especie 'Cítricos' genérica para el modo Campesino...");

  await db.$transaction(async (tx) => {
    const especie = await tx.especieCultivo.create({
      data: {
        slug: "citricos-generico",
        nombre: "Cítricos",
        familia: "Rutaceae",
        etapas: ["PREPARACION", "SIEMBRA", "ESTABLECIMIENTO", "CRECIMIENTO", "FLORACION", "PRODUCCION", "COSECHA"],
        tiposRegistro: ["SIEMBRA", "RIEGO", "FERTILIZACION", "PODA", "TRATAMIENTO_PLAGAS", "COSECHA", "OBSERVACION", "INSPECCION", "ALERTA"],
        umbralHelada: 3,
        umbralCalor: 34,
        lluviaMaxMm: 40,
        vientoMaxKmh: 45,
        cicloMesesPrimeraCosecha: 30,
        produccionKgArbolAnual: 60,
        altitudMin: 0,
        altitudMax: 1800,
        tempOptMin: 18,
        tempOptMax: 30,
        precipAnualMin: 900,
        precipAnualMax: 2000,
      },
    });

    const variedad = await tx.variedad.create({
      data: { especieId: especie.id, nombre: "Cítricos (genérico)", slug: "citricos-generico" },
    });

    const ficha = await tx.fichaTecnica.create({
      data: {
        variedadId: variedad.id,
        version: 1,
        estado: "PUBLICADA",
        publicadaEn: new Date(),
        notasVersion: "Sembrada para el selector de Diagnóstico del modo Campesino — catálogo de plagas es borrador inicial, pendiente de revisión agronómica formal.",
        altitudMinM: especie.altitudMin,
        altitudMaxM: especie.altitudMax,
        tempMinC: especie.tempOptMin,
        tempMaxC: especie.tempOptMax,
        precipitacionAnualMinMm: especie.precipAnualMin ? Math.round(especie.precipAnualMin) : null,
        precipitacionAnualMaxMm: especie.precipAnualMax ? Math.round(especie.precipAnualMax) : null,
      },
    });

    await tx.plagaEnfermedad.createMany({
      data: [
        {
          fichaId: ficha.id,
          nombre: "Minador de la hoja de los cítricos",
          tipo: "PLAGA",
          sintomas: "Galerías plateadas y sinuosas en el envés de hojas jóvenes; hojas enrolladas o deformadas.",
          manejoRecomendado: "Poda de brotes muy afectados, control biológico con parasitoides, evitar exceso de fertilización nitrogenada que dispara brotes tiernos.",
          imagenesRef: [],
          etapasSusceptibles: [],
        },
        {
          fichaId: ficha.id,
          nombre: "Cancro cítrico",
          tipo: "ENFERMEDAD",
          sintomas: "Lesiones corchosas circulares con halo amarillo en hojas, tallos y frutos.",
          manejoRecomendado: "Podar y quemar material afectado, desinfectar herramientas entre plantas, aplicar productos a base de cobre en época de lluvias, evitar mover material vegetal entre lotes.",
          imagenesRef: [],
          etapasSusceptibles: [],
        },
        {
          fichaId: ficha.id,
          nombre: "HLB / Dragón amarillo (Huanglongbing)",
          tipo: "ENFERMEDAD",
          sintomas: "Moteado asimétrico amarillo en las hojas, frutos pequeños y deformes que no maduran de color uniforme, defoliación progresiva.",
          manejoRecomendado: "No existe cura — reportar de inmediato al ICA, erradicar árboles confirmados, controlar el psílido asiático de los cítricos (vector) con manejo integrado.",
          imagenesRef: [],
          etapasSusceptibles: [],
        },
        {
          fichaId: ficha.id,
          nombre: "Ácaro tostador (roña)",
          tipo: "PLAGA",
          sintomas: "Coloración bronceada/plateada en la cáscara del fruto, sin afectar la pulpa.",
          manejoRecomendado: "Monitoreo con lupa en frutos jóvenes, control biológico con ácaros depredadores, azufre o aceites agrícolas si la infestación es alta.",
          imagenesRef: [],
          etapasSusceptibles: [],
        },
        {
          fichaId: ficha.id,
          nombre: "Deficiencia de zinc",
          tipo: "DEFICIENCIA_NUTRICIONAL",
          sintomas: "Hojas pequeñas y angostas con bandas verdes junto a la nervadura sobre fondo amarillo (mosaico).",
          manejoRecomendado: "Aplicación foliar de sulfato de zinc, revisar pH del suelo (la deficiencia se agrava en suelos alcalinos).",
          imagenesRef: [],
          etapasSusceptibles: [],
        },
      ],
    });
  });

  console.log("✅ 'Cítricos' genérico sembrado (especie + variedad + ficha PUBLICADA + 5 plagas/enfermedades).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
