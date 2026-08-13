/**
 * Siembra ActividadCalendario (riego/fertilización/poda/inspección) y
 * PlagaEnfermedad (con umbral climático) para Café Caturra y Cacao CCN-51 —
 * hasta ahora las únicas 2 fichas técnicas junto con Aguacate Hass sin
 * ningún dato de manejo, pese a tener sus 8 etapas fenológicas ya definidas.
 * Sin esto, el calendario proactivo (src/lib/alert-engine.ts) solo generaba
 * recordatorios reales para aguacate — exactamente el "nunca tratar café/
 * cacao como aguacate con otro nombre" que pide CLAUDE.md §4.
 *
 * Calendarios agronómicamente DISTINTOS entre sí y de aguacate (no una
 * copia con otro nombre): café tiene floración → llenado de grano → cosecha
 * selectiva → beneficio (despulpado/fermentación/secado); cacao tiene
 * manejo de sombra desde el establecimiento, floración caulinar, y
 * fermentación/secado post-cosecha con su propio ritmo. Basado en
 * conocimiento agronómico general de estos cultivos en Colombia (variedad
 * Caturra — precoz — y CCN-51 — también precoz), no verificado contra un
 * ingeniero agrónomo específico — mismo nivel de confianza que ya tenía el
 * seed de Aguacate Hass (prisma/seed-actividades-aguacate.ts).
 *
 * diaInicioRelativo/diaFinRelativo/frecuenciaDias: días desde
 * Cultivo.fechaSiembra, acumulados a través de TODAS las etapas (ver
 * comentario en generateActividadAlerts, src/lib/alert-engine.ts) — el
 * motor de alertas consulta por fichaId (vía etapa.fichaId), no filtra por
 * una etapa concreta. `etapaOrden` de cada actividad abajo solo decide a
 * cuál EtapaFenologica queda asociada en la BD, para que el panel de
 * administración de fichas técnicas la muestre agrupada correctamente.
 *
 * Idempotente: borra las actividades/plagas existentes de estas 2 fichas
 * antes de volver a crearlas.
 */
import { PrismaClient, TipoRegistro, TipoPlagaEnfermedad } from "@prisma/client";
import type { UmbralAlertaPlaga } from "../src/lib/fichas-tecnicas";

const db = new PrismaClient();

interface ActividadSeed {
  etapaOrden: number;
  nombre: string;
  tipoRegistro: TipoRegistro;
  diaInicioRelativo: number;
  diaFinRelativo?: number;
  frecuenciaDias?: number;
  obligatoria?: boolean;
  descripcion?: string;
}

interface PlagaSeed {
  nombre: string;
  tipo: TipoPlagaEnfermedad;
  sintomas: string;
  umbralAlerta: UmbralAlertaPlaga;
  manejoRecomendado: string;
  etapasSusceptibles: number[];
}

// ── CAFÉ CATURRA ─────────────────────────────────────────────────────────────
// Etapas reales (orden): 1 PREPARACION, 2 SIEMBRA, 3 ESTABLECIMIENTO,
// 4 CRECIMIENTO, 5 FLORACION, 6 LLENADO, 7 COSECHA, 8 BENEFICIO.
// Caturra es una variedad precoz — primera cosecha ~24 meses desde siembra
// a sitio definitivo (más rápida que Typica/Borbón).
const ACTIVIDADES_CAFE: ActividadSeed[] = [
  { etapaOrden: 2, nombre: "Primer riego post-siembra", tipoRegistro: "RIEGO", diaInicioRelativo: 0, diaFinRelativo: 3, obligatoria: true, descripcion: "Riego abundante inmediatamente después de trasplantar el almácigo a sitio definitivo." },
  { etapaOrden: 3, nombre: "Riego de establecimiento", tipoRegistro: "RIEGO", diaInicioRelativo: 4, diaFinRelativo: 180, frecuenciaDias: 6, descripcion: "Riego cada 5-7 días — la planta joven de café no tolera déficit hídrico prolongado en esta etapa." },
  { etapaOrden: 3, nombre: "Primera fertilización nitrogenada", tipoRegistro: "FERTILIZACION", diaInicioRelativo: 30, diaFinRelativo: 45, obligatoria: true, descripcion: "Fertilizante rico en nitrógeno (ej. urea o DAP) para arraigo y primeras hojas verdaderas." },
  { etapaOrden: 3, nombre: "Control de arvenses", tipoRegistro: "OBSERVACION", diaInicioRelativo: 60, diaFinRelativo: 180, frecuenciaDias: 30, descripcion: "Deshierbe manual o plateo — el cafeto joven compite mal por luz y nutrientes con malezas." },
  { etapaOrden: 4, nombre: "Fertilización trimestral N-P-K-Mg", tipoRegistro: "FERTILIZACION", diaInicioRelativo: 180, diaFinRelativo: 540, frecuenciaDias: 90, obligatoria: true, descripcion: "Fórmula completa acorde al análisis de suelo — base del desarrollo vegetativo antes de la primera floración." },
  { etapaOrden: 4, nombre: "Deshija y poda de formación", tipoRegistro: "PODA", diaInicioRelativo: 270, diaFinRelativo: 300, descripcion: "Selección de los mejores chupones/ejes para definir la arquitectura productiva de la planta." },
  { etapaOrden: 4, nombre: "Monitoreo preventivo de broca", tipoRegistro: "INSPECCION", diaInicioRelativo: 180, diaFinRelativo: 540, frecuenciaDias: 30, descripcion: "Revisión de frutos residuales de cosechas previas (repela) — foco de reinfestación de broca." },
  { etapaOrden: 5, nombre: "Fertilización pre-floración (boro)", tipoRegistro: "FERTILIZACION", diaInicioRelativo: 540, diaFinRelativo: 560, obligatoria: true, descripcion: "Aporte de boro y calcio para favorecer cuajado de flor a fruto." },
  { etapaOrden: 5, nombre: "Monitoreo de floración", tipoRegistro: "OBSERVACION", diaInicioRelativo: 540, diaFinRelativo: 600, frecuenciaDias: 15, descripcion: "La floración del café es sincronizada por lluvias — registrar fechas ayuda a proyectar la cosecha." },
  { etapaOrden: 6, nombre: "Fertilización de llenado (potasio)", tipoRegistro: "FERTILIZACION", diaInicioRelativo: 600, diaFinRelativo: 650, obligatoria: true, descripcion: "Alta en potasio — crítica para el llenado del grano, afecta directamente el rendimiento en almendra." },
  { etapaOrden: 6, nombre: "Riego crítico en llenado de grano", tipoRegistro: "RIEGO", diaInicioRelativo: 600, diaFinRelativo: 720, frecuenciaDias: 7, descripcion: "El déficit hídrico durante el llenado reduce peso y calidad del grano — vigilar especialmente en veranillos." },
  { etapaOrden: 6, nombre: "Inspección de roya", tipoRegistro: "INSPECCION", diaInicioRelativo: 600, diaFinRelativo: 720, frecuenciaDias: 20, obligatoria: true, descripcion: "Revisar el envés de las hojas — la roya avanza rápido en época de lluvias sostenidas." },
  { etapaOrden: 7, nombre: "Recolección selectiva de cereza madura", tipoRegistro: "COSECHA", diaInicioRelativo: 720, diaFinRelativo: 780, frecuenciaDias: 15, obligatoria: true, descripcion: "Cosechar solo cerezas rojas maduras (no verdes ni sobremaduras) — determina directamente la calidad de taza." },
  { etapaOrden: 8, nombre: "Beneficio: despulpado y fermentación", tipoRegistro: "COSECHA", diaInicioRelativo: 720, diaFinRelativo: 787, frecuenciaDias: 15, obligatoria: true, descripcion: "Despulpar dentro de las primeras horas tras la cosecha, fermentar 12-18h y lavar — el retraso arruina la calidad del grano." },
];

const PLAGAS_CAFE: PlagaSeed[] = [
  {
    nombre: "Broca del café",
    tipo: "PLAGA",
    sintomas: "Orificio pequeño y circular cerca del ápice del fruto, granos perforados y con galerías internas.",
    umbralAlerta: { humedadMinPct: 70, tempMinC: 20 },
    manejoRecomendado: "Recolección oportuna y completa (sin dejar frutos residuales — \"repela\"), trampas con atrayente, control biológico con Beauveria bassiana en focos altos.",
    etapasSusceptibles: [6, 7], // LLENADO, COSECHA — ataca el grano en desarrollo/maduro
  },
  {
    nombre: "Roya del café",
    tipo: "ENFERMEDAD",
    sintomas: "Manchas amarillo-anaranjadas polvorientas en el envés de las hojas, defoliación severa en ataques fuertes.",
    umbralAlerta: { humedadMinPct: 80, lluviaMinMm: 5 },
    manejoRecomendado: "Fungicida sistémico preventivo antes de picos de lluvia, fertilización balanceada (una planta débil es más susceptible), preferir variedades resistentes en siembras nuevas.",
    etapasSusceptibles: [4, 5, 6, 7], // CRECIMIENTO en adelante — afecta hoja, reduce capacidad fotosintética en toda la producción
  },
];

// ── CACAO CCN-51 ─────────────────────────────────────────────────────────────
// Etapas reales (orden): 1 PREPARACION, 2 SIEMBRA, 3 ESTABLECIMIENTO,
// 4 CRECIMIENTO, 5 FLORACION, 6 FRUCTIFICACION, 7 COSECHA, 8 FERMENTACION.
// CCN-51 es precoz (primera cosecha ~24 meses) — a diferencia del café, el
// manejo de sombra es una labor propia del cacao desde el establecimiento.
const ACTIVIDADES_CACAO: ActividadSeed[] = [
  { etapaOrden: 2, nombre: "Siembra de sombra temporal", tipoRegistro: "SIEMBRA", diaInicioRelativo: 0, diaFinRelativo: 5, obligatoria: true, descripcion: "Plátano/banano como sombra temporal — el cacao joven no tolera sol directo pleno." },
  { etapaOrden: 2, nombre: "Primer riego post-siembra", tipoRegistro: "RIEGO", diaInicioRelativo: 0, diaFinRelativo: 3, obligatoria: true, descripcion: "Riego abundante para asentar el material vegetal recién trasplantado." },
  { etapaOrden: 3, nombre: "Riego de establecimiento", tipoRegistro: "RIEGO", diaInicioRelativo: 4, diaFinRelativo: 180, frecuenciaDias: 5, descripcion: "Riego frecuente — el sistema radicular del cacao joven es muy sensible al estrés hídrico." },
  { etapaOrden: 3, nombre: "Primera fertilización", tipoRegistro: "FERTILIZACION", diaInicioRelativo: 45, diaFinRelativo: 60, obligatoria: true, descripcion: "Fórmula completa con énfasis en fósforo para desarrollo radicular temprano." },
  { etapaOrden: 3, nombre: "Raleo de sombra", tipoRegistro: "PODA", diaInicioRelativo: 60, diaFinRelativo: 180, frecuenciaDias: 60, descripcion: "Reducir gradualmente la sombra temporal a medida que el cacao desarrolla su propia copa." },
  { etapaOrden: 4, nombre: "Fertilización trimestral", tipoRegistro: "FERTILIZACION", diaInicioRelativo: 180, diaFinRelativo: 540, frecuenciaDias: 90, obligatoria: true, descripcion: "N-P-K-Mg acorde al desarrollo de copa — base del futuro potencial productivo." },
  { etapaOrden: 4, nombre: "Poda de formación", tipoRegistro: "PODA", diaInicioRelativo: 270, diaFinRelativo: 300, descripcion: "Definir 3-4 ramas principales (estructura en candelabro) para facilitar luz, ventilación y cosecha futura." },
  { etapaOrden: 4, nombre: "Inspección de monilia y escoba de bruja", tipoRegistro: "INSPECCION", diaInicioRelativo: 180, diaFinRelativo: 540, frecuenciaDias: 30, obligatoria: true, descripcion: "Las dos enfermedades más destructivas del cacao en Colombia — revisar brotes vegetativos y mazorcas jóvenes." },
  { etapaOrden: 5, nombre: "Fertilización con boro y zinc (floración)", tipoRegistro: "FERTILIZACION", diaInicioRelativo: 540, diaFinRelativo: 560, obligatoria: true, descripcion: "Favorece cuajado de flor — el cacao florece directamente en tronco y ramas (caulifloria)." },
  { etapaOrden: 5, nombre: "Manejo de sombra para polinizadores", tipoRegistro: "OBSERVACION", diaInicioRelativo: 540, diaFinRelativo: 600, descripcion: "La polinización del cacao depende de mosquitas (Forcipomyia) que necesitan hojarasca y sombra húmeda para reproducirse." },
  { etapaOrden: 6, nombre: "Fertilización potásica (fructificación)", tipoRegistro: "FERTILIZACION", diaInicioRelativo: 600, diaFinRelativo: 650, obligatoria: true, descripcion: "Alta en potasio — determina tamaño y llenado de la mazorca en desarrollo." },
  { etapaOrden: 6, nombre: "Poda fitosanitaria (control de monilia)", tipoRegistro: "PODA", diaInicioRelativo: 600, diaFinRelativo: 720, frecuenciaDias: 15, obligatoria: true, descripcion: "Retirar y destruir mazorcas enfermas de monilia semanalmente — es la práctica de control más efectiva, más que cualquier fungicida." },
  { etapaOrden: 7, nombre: "Cosecha de mazorcas maduras", tipoRegistro: "COSECHA", diaInicioRelativo: 720, diaFinRelativo: 780, frecuenciaDias: 15, obligatoria: true, descripcion: "Cosechar mazorcas en el punto justo de madurez (cambio de color) — inmaduras o sobremaduras afectan el rendimiento de almendra." },
  { etapaOrden: 8, nombre: "Fermentación y secado post-cosecha", tipoRegistro: "COSECHA", diaInicioRelativo: 720, diaFinRelativo: 787, frecuenciaDias: 15, obligatoria: true, descripcion: "Fermentar en cajones 5-7 días con volteos regulares, luego secar al sol 5-7 días más — define el perfil de sabor del cacao." },
];

const PLAGAS_CACAO: PlagaSeed[] = [
  {
    nombre: "Monilia",
    tipo: "ENFERMEDAD",
    sintomas: "Manchas oscuras irregulares en la mazorca, deformación, y una capa polvorienta blanquecina en estados avanzados.",
    umbralAlerta: { humedadMinPct: 85, lluviaMinMm: 15 },
    manejoRecomendado: "Poda fitosanitaria semanal retirando mazorcas enfermas (la práctica más efectiva), mejorar ventilación de la copa, evitar encharcamiento en el lote.",
    etapasSusceptibles: [6, 7], // FRUCTIFICACION, COSECHA — ataca directamente la mazorca en desarrollo
  },
  {
    nombre: "Escoba de bruja",
    tipo: "ENFERMEDAD",
    sintomas: "Brotes vegetativos deformes en forma de escoba, engrosamiento anormal de ramas, mazorcas deformes que no desarrollan almendra.",
    umbralAlerta: { humedadMinPct: 85 },
    manejoRecomendado: "Poda de las estructuras afectadas (\"escobas\") y destrucción del material podado fuera del lote, no dejarlo en el suelo donde libera esporas.",
    etapasSusceptibles: [4, 5, 6], // CRECIMIENTO, FLORACION, FRUCTIFICACION — afecta puntos de crecimiento activo
  },
];

async function sembrarFicha(
  nombre: string,
  ficha: { id: string; etapas: { id: string; orden: number }[] },
  actividades: ActividadSeed[],
  plagas: PlagaSeed[]
) {
  const etapaIdPorOrden = new Map(ficha.etapas.map((e) => [e.orden, e.id]));

  await db.actividadCalendario.deleteMany({ where: { etapa: { fichaId: ficha.id } } });
  await db.actividadCalendario.createMany({
    data: actividades.map(({ etapaOrden, ...a }) => {
      const etapaId = etapaIdPorOrden.get(etapaOrden);
      if (!etapaId) throw new Error(`${nombre}: no existe la etapa de orden ${etapaOrden}`);
      return { ...a, etapaId };
    }),
  });

  await db.plagaEnfermedad.deleteMany({ where: { fichaId: ficha.id } });
  await db.plagaEnfermedad.createMany({
    data: plagas.map((p) => ({
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

  console.log(`${nombre}: ${actividades.length} actividades de calendario, ${plagas.length} plagas/enfermedades sembradas.`);
}

async function main() {
  const [fichaCafe, fichaCacao] = await Promise.all([
    db.fichaTecnica.findFirst({
      where: { variedad: { especie: { slug: "cafe" }, nombre: "Caturra" } },
      include: { etapas: { select: { id: true, orden: true } } },
    }),
    db.fichaTecnica.findFirst({
      where: { variedad: { especie: { slug: "cacao" }, nombre: "CCN-51" } },
      include: { etapas: { select: { id: true, orden: true } } },
    }),
  ]);
  if (!fichaCafe) throw new Error("No se encontró la ficha técnica de Café Caturra");
  if (!fichaCacao) throw new Error("No se encontró la ficha técnica de Cacao CCN-51");

  await sembrarFicha("Café Caturra", fichaCafe, ACTIVIDADES_CAFE, PLAGAS_CAFE);
  await sembrarFicha("Cacao CCN-51", fichaCacao, ACTIVIDADES_CACAO, PLAGAS_CACAO);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
