-- CreateEnum
CREATE TYPE "RiesgoAsegurado" AS ENUM ('SEQUIA', 'EXCESO_LLUVIA', 'HELADA', 'GRANIZO', 'VIENTOS_FUERTES', 'INUNDACION', 'PLAGAS_ENFERMEDADES', 'INCENDIO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoPoliza" AS ENUM ('ACTIVA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoSiniestro" AS ENUM ('REGISTRADO', 'REPORTADO_ASEGURADORA', 'EN_REVISION', 'APROBADO', 'PAGADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "polizas_seguro" (
    "id" TEXT NOT NULL,
    "fincaId" TEXT NOT NULL,
    "aseguradora" TEXT NOT NULL,
    "numeroPoliza" TEXT,
    "riesgos" "RiesgoAsegurado"[],
    "sumaAsegurada" DOUBLE PRECISION,
    "prima" DOUBLE PRECISION,
    "deduciblePct" DOUBLE PRECISION,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoPoliza" NOT NULL DEFAULT 'ACTIVA',
    "contacto" TEXT,
    "notas" TEXT,
    "gastoId" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "polizas_seguro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polizas_cultivo" (
    "polizaId" TEXT NOT NULL,
    "cultivoId" TEXT NOT NULL,

    CONSTRAINT "polizas_cultivo_pkey" PRIMARY KEY ("polizaId","cultivoId")
);

-- CreateTable
CREATE TABLE "siniestros" (
    "id" TEXT NOT NULL,
    "fincaId" TEXT NOT NULL,
    "cultivoId" TEXT NOT NULL,
    "polizaId" TEXT,
    "tipo" "RiesgoAsegurado" NOT NULL,
    "fechaEvento" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "areaAfectadaHa" DOUBLE PRECISION,
    "porcentajeDanio" INTEGER,
    "perdidaEstimada" DOUBLE PRECISION,
    "estado" "EstadoSiniestro" NOT NULL DEFAULT 'REGISTRADO',
    "numeroReclamo" TEXT,
    "fechaReporteAseguradora" TIMESTAMP(3),
    "montoIndemnizado" DOUBLE PRECISION,
    "imagenes" TEXT[],
    "notas" TEXT,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "siniestros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "polizas_seguro_fincaId_idx" ON "polizas_seguro"("fincaId");

-- CreateIndex
CREATE INDEX "polizas_cultivo_cultivoId_idx" ON "polizas_cultivo"("cultivoId");

-- CreateIndex
CREATE INDEX "siniestros_fincaId_idx" ON "siniestros"("fincaId");

-- CreateIndex
CREATE INDEX "siniestros_cultivoId_idx" ON "siniestros"("cultivoId");

-- AddForeignKey
ALTER TABLE "polizas_seguro" ADD CONSTRAINT "polizas_seguro_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "fincas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polizas_cultivo" ADD CONSTRAINT "polizas_cultivo_polizaId_fkey" FOREIGN KEY ("polizaId") REFERENCES "polizas_seguro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polizas_cultivo" ADD CONSTRAINT "polizas_cultivo_cultivoId_fkey" FOREIGN KEY ("cultivoId") REFERENCES "cultivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestros" ADD CONSTRAINT "siniestros_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "fincas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestros" ADD CONSTRAINT "siniestros_cultivoId_fkey" FOREIGN KEY ("cultivoId") REFERENCES "cultivos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "siniestros" ADD CONSTRAINT "siniestros_polizaId_fkey" FOREIGN KEY ("polizaId") REFERENCES "polizas_seguro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

