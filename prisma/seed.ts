import { PrismaClient, EtapaCultivo, EstadoCultivo, TipoRegistro, CategoriaGasto, TipoComprador, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Sembrando datos iniciales...");

  // ── User
  const password = await bcrypt.hash("agro2026", 12);
  const user = await prisma.user.upsert({
    where: { email: "info@fincaalvarezpacheco.co" },
    update: {},
    create: {
      email: "info@fincaalvarezpacheco.co",
      name: "Eduard Álvarez Pacheco",
      password,
      role: UserRole.PRODUCER,
      telefono: "+57 300 000 0000",
    },
  });

  // ── Finca
  const finca = await prisma.finca.upsert({
    where: { id: "finca-alvarez-pacheco" },
    update: {},
    create: {
      id: "finca-alvarez-pacheco",
      nombre: "Finca Álvarez Pacheco",
      municipio: "Norte de Santander",
      departamento: "Norte de Santander",
      altitud: 1835,
      lat: 7.9273,
      lng: -72.5078,
      areaTotal: 2.0,
      userId: user.id,
    },
  });

  // ── Lote A
  const loteA = await prisma.lote.upsert({
    where: { id: "lote-a-alvarez" },
    update: {},
    create: {
      id: "lote-a-alvarez",
      nombre: "Lote A",
      fincaId: finca.id,
      areaHa: 1.0,
      pendiente: 15,
      altitud: 1850,
      lat: 7.928,
      lng: -72.508,
      geoJson: {
        type: "Polygon",
        coordinates: [[
          [-72.5095, 7.9285],
          [-72.5075, 7.9290],
          [-72.5070, 7.9270],
          [-72.5090, 7.9265],
          [-72.5095, 7.9285],
        ]],
      },
      notas: "Pendiente 15°. Buen drenaje natural. Cerca a fuente hídrica.",
    },
  });

  // ── Lote B
  const loteB = await prisma.lote.upsert({
    where: { id: "lote-b-alvarez" },
    update: {},
    create: {
      id: "lote-b-alvarez",
      nombre: "Lote B",
      fincaId: finca.id,
      areaHa: 1.0,
      pendiente: 12,
      altitud: 1820,
      lat: 7.926,
      lng: -72.506,
      geoJson: {
        type: "Polygon",
        coordinates: [[
          [-72.5070, 7.9275],
          [-72.5050, 7.9280],
          [-72.5045, 7.9260],
          [-72.5065, 7.9255],
          [-72.5070, 7.9275],
        ]],
      },
      notas: "Pendiente 12°. Acceso directo por camino interno.",
    },
  });

  // ── Cultivos
  const cultivoA = await prisma.cultivo.upsert({
    where: { id: "cultivo-a-hass" },
    update: {},
    create: {
      id: "cultivo-a-hass",
      loteId: loteA.id,
      especie: "Aguacate",
      variedad: "Hass",
      fechaSiembra: new Date("2026-07-09"),
      cantidadPlantas: 160,
      densidadHa: 160,
      etapa: EtapaCultivo.SIEMBRA,
      estado: EstadoCultivo.ACTIVO,
      notas: "Distancia de siembra 8x8m. Material certificado.",
    },
  });

  const cultivoB = await prisma.cultivo.upsert({
    where: { id: "cultivo-b-hass" },
    update: {},
    create: {
      id: "cultivo-b-hass",
      loteId: loteB.id,
      especie: "Aguacate",
      variedad: "Hass",
      fechaSiembra: new Date("2026-07-09"),
      cantidadPlantas: 160,
      densidadHa: 160,
      etapa: EtapaCultivo.SIEMBRA,
      estado: EstadoCultivo.ACTIVO,
      notas: "Distancia de siembra 8x8m. Material certificado.",
    },
  });

  // ── Registros de actividad
  await prisma.registroCultivo.createMany({
    data: [
      {
        cultivoId: cultivoA.id,
        tipo: TipoRegistro.OBSERVACION,
        descripcion: "Preparación del terreno completada. Subsolado y nivelación en Lote A.",
        fecha: new Date("2026-07-05"),
        imagenes: [],
      },
      {
        cultivoId: cultivoB.id,
        tipo: TipoRegistro.OBSERVACION,
        descripcion: "Preparación del terreno completada. Subsolado y nivelación en Lote B.",
        fecha: new Date("2026-07-06"),
        imagenes: [],
      },
      {
        cultivoId: cultivoA.id,
        tipo: TipoRegistro.SIEMBRA,
        descripcion: "Inicio de siembra Lote A. Primeras 40 plántulas Hass sembradas.",
        fecha: new Date("2026-07-09"),
        imagenes: [],
      },
      {
        cultivoId: cultivoB.id,
        tipo: TipoRegistro.SIEMBRA,
        descripcion: "Inicio de siembra Lote B. Primeras 35 plántulas Hass sembradas.",
        fecha: new Date("2026-07-09"),
        imagenes: [],
      },
    ],
    skipDuplicates: true,
  });

  // ── Gastos históricos (preparación + siembra)
  await prisma.gasto.createMany({
    data: [
      {
        cultivoId: cultivoA.id,
        concepto: "Plántulas Hass certificadas - Lote A",
        categoria: CategoriaGasto.SEMILLAS_PLANTULAS,
        monto: 800000,
        fecha: new Date("2026-07-01"),
        proveedor: "Vivero Agropaltas",
        notas: "160 unidades a $5,000 c/u",
      },
      {
        cultivoId: cultivoB.id,
        concepto: "Plántulas Hass certificadas - Lote B",
        categoria: CategoriaGasto.SEMILLAS_PLANTULAS,
        monto: 800000,
        fecha: new Date("2026-07-01"),
        proveedor: "Vivero Agropaltas",
        notas: "160 unidades a $5,000 c/u",
      },
      {
        cultivoId: cultivoA.id,
        concepto: "Subsolado y preparación terreno - Lote A",
        categoria: CategoriaGasto.MAQUINARIA,
        monto: 350000,
        fecha: new Date("2026-07-04"),
        proveedor: "Maquinaria local",
      },
      {
        cultivoId: cultivoB.id,
        concepto: "Subsolado y preparación terreno - Lote B",
        categoria: CategoriaGasto.MAQUINARIA,
        monto: 320000,
        fecha: new Date("2026-07-04"),
        proveedor: "Maquinaria local",
      },
      {
        cultivoId: cultivoA.id,
        concepto: "Mano de obra siembra Lote A",
        categoria: CategoriaGasto.MANO_OBRA,
        monto: 200000,
        fecha: new Date("2026-07-09"),
        notas: "2 jornales",
      },
      {
        cultivoId: cultivoB.id,
        concepto: "Mano de obra siembra Lote B",
        categoria: CategoriaGasto.MANO_OBRA,
        monto: 200000,
        fecha: new Date("2026-07-09"),
        notas: "2 jornales",
      },
    ],
    skipDuplicates: true,
  });

  // ── Compradores iniciales
  const comprador1 = await prisma.comprador.upsert({
    where: { id: "comp-coopagrons" },
    update: {},
    create: {
      id: "comp-coopagrons",
      userId: user.id,
      nombre: "CoopAgroNS",
      tipo: TipoComprador.COOPERATIVA,
      ciudad: "Cúcuta",
      departamento: "Norte de Santander",
      contacto: "Gerente Comercial",
      telefono: "+57 310 000 0001",
      capacidadTon: 10,
      precioKg: 3200,
      estado: "ACTIVO",
      notas: "Cooperativa local. Compra mínima 500 kg. Pago a 15 días.",
    },
  });

  await prisma.comprador.upsert({
    where: { id: "comp-exports-col" },
    update: {},
    create: {
      id: "comp-exports-col",
      userId: user.id,
      nombre: "Exports Colombia S.A.S",
      tipo: TipoComprador.EXPORTADOR,
      ciudad: "Bogotá",
      departamento: "Cundinamarca",
      contacto: "Área de Abastecimiento",
      email: "abastecimiento@exportscol.co",
      capacidadTon: 50,
      precioKg: 4100,
      estado: "PROSPECTO",
      notas: "Prospecto. Exportan a Europa. Requieren certificación BPA mínimo.",
    },
  });

  // ── Alerta climática activa
  await prisma.alertaClimatica.create({
    data: {
      tipo: "HELADA",
      titulo: "Posible helada el sábado 12 de julio",
      descripcion:
        "Temperatura mínima proyectada 8°C en zona alta. Plántulas de aguacate recién sembradas son vulnerables. Se recomienda aplicar riego nocturno y cubrir las plantas.",
      severidad: "ALTA",
      fechaInicio: new Date("2026-07-12T03:00:00"),
      fechaFin: new Date("2026-07-12T08:00:00"),
      activa: true,
      leida: false,
      municipio: "Norte de Santander",
      datos: {
        tempMin: 8,
        tempMax: 22,
        humedad: 72,
        fuente: "IDEAM + OpenWeather",
      },
    },
  });

  console.log("✅ Datos sembrados correctamente");
  console.log(`   👤 Usuario: info@fincaalvarezpacheco.co / agro2026`);
  console.log(`   🌿 Finca: ${finca.nombre}`);
  console.log(`   🌱 Cultivos: Lote A (${cultivoA.cantidadPlantas} plantas) + Lote B (${cultivoB.cantidadPlantas} plantas)`);
  console.log(`   💰 Compradores: ${comprador1.nombre} y Exports Colombia`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
