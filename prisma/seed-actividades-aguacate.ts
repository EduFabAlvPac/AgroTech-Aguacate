/**
 * Siembra ActividadCalendario reales para la ficha técnica de Aguacate Hass
 * (el único cultivo con producción real en este momento — Finca El Juncal).
 * Sin esto, el motor de "calendario de actividades proyectado"
 * (src/lib/alert-engine.ts generateActividadAlerts) no tiene nada que
 * proyectar — EtapaFenologica existe desde Fase 1 pero sin actividades.
 *
 * diaInicioRelativo/diaFinRelativo/frecuenciaDias son días desde
 * Cultivo.fechaSiembra (ver comentario en alert-engine.ts). Café y Cacao ya
 * tienen su propio seed — ver prisma/seed-fichas-cafe-cacao.ts.
 *
 * Idempotente: borra las actividades existentes de esta ficha antes de
 * volver a crearlas, para poder correrlo de nuevo sin duplicar.
 */
import { PrismaClient, TipoRegistro } from "@prisma/client";

const db = new PrismaClient();

// orden de EtapaFenologica → actividades. generateActividadAlerts ya no
// depende de este orden para decidir qué actividad corresponde (usa la
// ventana de días acumulados desde la siembra, ver alert-engine.ts) — sigue
// organizado por etapa aquí solo porque es más legible al escribir el seed.
const ACTIVIDADES_POR_ETAPA: Record<number, {
  nombre: string; tipoRegistro: TipoRegistro; diaInicioRelativo: number; diaFinRelativo?: number;
  frecuenciaDias?: number; obligatoria?: boolean; descripcion?: string;
}[]> = {
  // SIEMBRA (orden 2)
  2: [
    {
      nombre: "Primer riego post-siembra",
      tipoRegistro: "RIEGO",
      diaInicioRelativo: 0,
      diaFinRelativo: 2,
      obligatoria: true,
      descripcion: "Riego abundante inmediatamente después de sembrar para asentar la tierra alrededor de la raíz.",
    },
    {
      nombre: "Riego de establecimiento",
      tipoRegistro: "RIEGO",
      diaInicioRelativo: 3,
      diaFinRelativo: 55,
      frecuenciaDias: 3,
      descripcion: "3-4 L/planta cada 2-3 días durante las primeras semanas — la plántula aún no tiene raíces profundas.",
    },
    {
      nombre: "Primera fertilización (mes 2)",
      tipoRegistro: "FERTILIZACION",
      diaInicioRelativo: 45,
      diaFinRelativo: 55,
      obligatoria: true,
      descripcion: "50 g de 8-20-20 por planta — primer aporte de nutrientes tras el arraigo inicial.",
    },
  ],
  // ESTABLECIMIENTO (orden 3)
  3: [
    {
      nombre: "Segunda fertilización + Zinc",
      tipoRegistro: "FERTILIZACION",
      diaInicioRelativo: 60,
      diaFinRelativo: 75,
      obligatoria: true,
      descripcion: "100 g de 8-20-20 + Zinc por planta.",
    },
    {
      nombre: "Riego de establecimiento",
      tipoRegistro: "RIEGO",
      diaInicioRelativo: 60,
      diaFinRelativo: 270,
      frecuenciaDias: 5,
      descripcion: "Riego cada 4-5 días según lluvias — vigilar que el suelo no se encharque.",
    },
    {
      nombre: "Fertilización trimestral",
      tipoRegistro: "FERTILIZACION",
      diaInicioRelativo: 150,
      diaFinRelativo: 160,
      obligatoria: true,
      descripcion: "150 g de 8-20-20 por planta.",
    },
    {
      nombre: "Primera poda de formación",
      tipoRegistro: "PODA",
      diaInicioRelativo: 90,
      diaFinRelativo: 110,
      descripcion: "Despunte para definir la estructura de ramas principales del árbol joven.",
    },
    {
      nombre: "Inspección de antracnosis y Phytophthora",
      tipoRegistro: "INSPECCION",
      diaInicioRelativo: 60,
      diaFinRelativo: 270,
      frecuenciaDias: 20,
      descripcion: "Revisar hojas y raíces — la plántula en establecimiento es la etapa más vulnerable a estas dos enfermedades.",
    },
  ],
  // CRECIMIENTO (orden 4)
  4: [
    {
      nombre: "Fertilización de crecimiento",
      tipoRegistro: "FERTILIZACION",
      diaInicioRelativo: 270,
      diaFinRelativo: 900,
      frecuenciaDias: 90,
      obligatoria: true,
      descripcion: "Fertilización trimestral acorde al desarrollo de copa y raíz.",
    },
    {
      nombre: "Poda de mantenimiento",
      tipoRegistro: "PODA",
      diaInicioRelativo: 270,
      diaFinRelativo: 900,
      frecuenciaDias: 180,
      descripcion: "Poda semestral de ramas cruzadas/enfermas y aireación de copa.",
    },
    {
      nombre: "Inspección de plagas y enfermedades",
      tipoRegistro: "INSPECCION",
      diaInicioRelativo: 270,
      diaFinRelativo: 900,
      frecuenciaDias: 30,
      descripcion: "Monitoreo mensual — trips, ácaros y antracnosis en hojas nuevas.",
    },
  ],
  // PRODUCCION (orden 5)
  5: [
    {
      nombre: "Fertilización pre-floración",
      tipoRegistro: "FERTILIZACION",
      diaInicioRelativo: 900,
      diaFinRelativo: 1300,
      frecuenciaDias: 120,
      obligatoria: true,
      descripcion: "Aporte de potasio y boro para favorecer cuajado de fruto.",
    },
    {
      nombre: "Monitoreo de plagas en producción",
      tipoRegistro: "INSPECCION",
      diaInicioRelativo: 900,
      diaFinRelativo: 1300,
      frecuenciaDias: 15,
      obligatoria: true,
      descripcion: "El fruto en desarrollo es más sensible a trips y antracnosis — inspección quincenal.",
    },
  ],
};

async function main() {
  const ficha = await db.fichaTecnica.findFirst({
    where: { variedad: { especie: { slug: "aguacate" }, nombre: "Hass" } },
    include: { etapas: true },
  });
  if (!ficha) throw new Error("No se encontró la ficha técnica de Aguacate Hass");

  let total = 0;
  for (const etapa of ficha.etapas) {
    const actividades = ACTIVIDADES_POR_ETAPA[etapa.orden];
    if (!actividades) continue;

    await db.actividadCalendario.deleteMany({ where: { etapaId: etapa.id } });
    await db.actividadCalendario.createMany({
      data: actividades.map((a) => ({ ...a, etapaId: etapa.id })),
    });
    total += actividades.length;
    console.log(`Etapa ${etapa.orden} (${etapa.nombre}): ${actividades.length} actividades`);
  }

  console.log(`\nTotal actividades sembradas: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
