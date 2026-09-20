-- ============================================================================
-- ADR-011 (IAM) — migración ADITIVA para producción (Neon)
-- ============================================================================
-- Generado con:
--   npx prisma migrate diff \
--     --from-schema-datamodel <prisma/schema.prisma de main antes del PR> \
--     --to-schema-datamodel   prisma/schema.prisma \
--     --script
--
-- Por qué existe: el build de Vercel corre `prisma db push` SIN
-- --accept-data-loss (ver scripts/db-push-produccion.mjs, a propósito). Como
-- este cambio agrega un índice único nuevo (`organizaciones.nit`), Prisma
-- pedirá esa bandera y el build fallará — igual que pasó con `telefono` y con
-- `tokenVerificacion`. Aplicando este script ANTES de mergear, `db push`
-- encuentra la base ya sincronizada y el deploy pasa limpio.
--
-- Verificado: NO contiene DROP, RENAME, TRUNCATE, DELETE FROM, SET NOT NULL ni
-- ALTER COLUMN. Solo CREATE TYPE / CREATE TABLE / CREATE INDEX /
-- ALTER TYPE ... ADD VALUE / ADD COLUMN (todos los NOT NULL con DEFAULT) /
-- ADD CONSTRAINT ... FOREIGN KEY. No toca ni una fila existente.
--
-- Cómo aplicarlo: Neon → SQL Editor → pegar todo el archivo → Run.
-- Es idempotente SOLO a medias (CREATE TYPE/TABLE fallan si ya existen): si
-- falla a la mitad, no lo repitas entero — avisa qué sentencia falló.
--
-- Después de aplicarlo NO hace falta backfill para que la app funcione: nada
-- en el código lee todavía las columnas nuevas. El backfill de datos
-- (estado/rolIam/esRolPrimario/metodoAuthPreferido) llega con el Sprint 1.
-- ============================================================================

-- CreateEnum
CREATE TYPE "ResultadoAudit" AS ENUM ('EXITO', 'FALLIDO', 'DENEGADO');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPER_ADMIN', 'PLATFORM_SUPPORT', 'ORG_OWNER', 'ORG_ADMIN', 'FARM_OWNER', 'FARM_ADMIN', 'FARM_COLLABORATOR', 'INVESTOR', 'BUYER');

-- CreateEnum
CREATE TYPE "EstadoMembresia" AS ENUM ('ACTIVA', 'PENDIENTE_INVITACION', 'SUSPENDIDA', 'REVOCADA');

-- CreateEnum
CREATE TYPE "MetodoAuth" AS ENUM ('EMAIL_PASSWORD', 'GOOGLE', 'WHATSAPP_MAGIC_LINK', 'SAML_SSO');

-- CreateEnum
CREATE TYPE "TipoOrg" AS ENUM ('INDIVIDUAL', 'COOPERATIVA', 'GREMIO', 'ASOCIACION_CAMPESINA', 'FUNDACION', 'GOBIERNO', 'UNIVERSIDAD', 'ONG', 'EMPRESA_PRIVADA', 'CRECIAGRO_INTERNAL');

-- CreateEnum
CREATE TYPE "EstadoPlan" AS ENUM ('EN_TRIAL', 'ACTIVA', 'SUSPENDIDA_PAGO', 'CANCELADA', 'MOROSA');

-- CreateEnum
CREATE TYPE "CicloFacturacion" AS ENUM ('MENSUAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "TipoToken" AS ENUM ('MAGIC_LINK_WHATSAPP', 'RESET_PASSWORD', 'VERIFY_EMAIL', 'MFA_BACKUP_CODE');

-- CreateEnum
CREATE TYPE "CanalInvitacion" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADA', 'VENCIDA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoImpersonacion" AS ENUM ('PENDIENTE_CONSENTIMIENTO', 'ACTIVA', 'FINALIZADA', 'DENEGADA', 'EXPIRADA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PlanOrganizacion" ADD VALUE 'SEMILLA_TRIAL';
ALTER TYPE "PlanOrganizacion" ADD VALUE 'FINCA_PRO';
ALTER TYPE "PlanOrganizacion" ADD VALUE 'COLECTIVO';
ALTER TYPE "PlanOrganizacion" ADD VALUE 'EMPRESARIAL';
ALTER TYPE "PlanOrganizacion" ADD VALUE 'GERMIAMIGO_INDIVIDUAL';
ALTER TYPE "PlanOrganizacion" ADD VALUE 'GERMIAMIGO_SEMILLA';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "consentimientoVersion" TEXT,
ADD COLUMN     "documentoIdentidad" TEXT,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "metodoAuthPreferido" "MetodoAuth" NOT NULL DEFAULT 'EMAIL_PASSWORD',
ADD COLUMN     "mfaBackupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mfaHabilitado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "telefonoVerificadoEn" TIMESTAMP(3),
ADD COLUMN     "ultimaIpAcceso" TEXT,
ADD COLUMN     "ultimoAccesoEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "organizaciones" ADD COLUMN     "celularContacto" TEXT,
ADD COLUMN     "cicloFacturacion" "CicloFacturacion" NOT NULL DEFAULT 'MENSUAL',
ADD COLUMN     "ciudad" TEXT,
ADD COLUMN     "colorPrimario" TEXT,
ADD COLUMN     "configuracion" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "departamento" TEXT,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3),
ADD COLUMN     "emailContacto" TEXT,
ADD COLUMN     "esTrial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estadoPlan" "EstadoPlan" NOT NULL DEFAULT 'ACTIVA',
ADD COLUMN     "limiteAsociadosPlan" INTEGER,
ADD COLUMN     "limiteFincasPlan" INTEGER,
ADD COLUMN     "limiteUsuariosPlan" INTEGER,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "nit" TEXT,
ADD COLUMN     "paisIso" TEXT NOT NULL DEFAULT 'CO',
ADD COLUMN     "planIniciadoEn" TIMESTAMP(3),
ADD COLUMN     "planVigenteHasta" TIMESTAMP(3),
ADD COLUMN     "tipo" "TipoOrg" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN     "trialFinEn" TIMESTAMP(3),
ADD COLUMN     "trialInicioEn" TIMESTAMP(3),
ADD COLUMN     "trialMaxAsociados" INTEGER DEFAULT 5;

-- AlterTable
ALTER TABLE "membresias" ADD COLUMN     "aceptadoEn" TIMESTAMP(3),
ADD COLUMN     "esRolPrimario" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estado" "EstadoMembresia" NOT NULL DEFAULT 'ACTIVA',
ADD COLUMN     "fincaId" TEXT,
ADD COLUMN     "motivoRevocacion" TEXT,
ADD COLUMN     "revocadoEn" TIMESTAMP(3),
ADD COLUMN     "revocadoPorId" TEXT,
ADD COLUMN     "rolIam" "Rol";

-- AlterTable
ALTER TABLE "inversionistas" ADD COLUMN     "cuentaUserId" TEXT;

-- AlterTable
ALTER TABLE "audit_log" ADD COLUMN     "esImpersonacion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hashActual" TEXT,
ADD COLUMN     "hashPrevio" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "organizacionId" TEXT,
ADD COLUMN     "recurso" TEXT,
ADD COLUMN     "recursoId" TEXT,
ADD COLUMN     "resultado" "ResultadoAudit" NOT NULL DEFAULT 'EXITO',
ADD COLUMN     "soporteUserId" TEXT,
ADD COLUMN     "targetUserId" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- CreateTable
CREATE TABLE "sesiones" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "dispositivo" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "ubicacion" TEXT,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "revocadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_auth" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoToken" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "metadata" JSONB,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "invalidadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_auth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitaciones" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "emailOCelular" TEXT NOT NULL,
    "canalEnvio" "CanalInvitacion" NOT NULL,
    "rol" "Rol" NOT NULL,
    "fincaId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "aceptadaEn" TIMESTAMP(3),
    "invitadaPorId" TEXT NOT NULL,
    "mensajePersonal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturacion" (
    "id" TEXT NOT NULL,
    "organizacionId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "montoCop" DECIMAL(12,2) NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "pagadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facturacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "impersonaciones" (
    "id" TEXT NOT NULL,
    "soporteUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "organizacionId" TEXT,
    "tokenConsentimiento" TEXT NOT NULL,
    "consentimientoDadoEn" TIMESTAMP(3),
    "canalConsentimiento" "CanalInvitacion",
    "motivo" TEXT NOT NULL,
    "iniciadaEn" TIMESTAMP(3),
    "finalizadaEn" TIMESTAMP(3),
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoImpersonacion" NOT NULL DEFAULT 'PENDIENTE_CONSENTIMIENTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impersonaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sesiones_tokenHash_key" ON "sesiones"("tokenHash");

-- CreateIndex
CREATE INDEX "sesiones_userId_revocadaEn_idx" ON "sesiones"("userId", "revocadaEn");

-- CreateIndex
CREATE INDEX "sesiones_expiraEn_idx" ON "sesiones"("expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_auth_tokenHash_key" ON "tokens_auth"("tokenHash");

-- CreateIndex
CREATE INDEX "tokens_auth_userId_tipo_idx" ON "tokens_auth"("userId", "tipo");

-- CreateIndex
CREATE INDEX "tokens_auth_expiraEn_idx" ON "tokens_auth"("expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "invitaciones_tokenHash_key" ON "invitaciones"("tokenHash");

-- CreateIndex
CREATE INDEX "invitaciones_organizacionId_aceptadaEn_idx" ON "invitaciones"("organizacionId", "aceptadaEn");

-- CreateIndex
CREATE INDEX "invitaciones_emailOCelular_idx" ON "invitaciones"("emailOCelular");

-- CreateIndex
CREATE INDEX "invitaciones_expiraEn_idx" ON "invitaciones"("expiraEn");

-- CreateIndex
CREATE UNIQUE INDEX "facturacion_organizacionId_periodo_key" ON "facturacion"("organizacionId", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "impersonaciones_tokenConsentimiento_key" ON "impersonaciones"("tokenConsentimiento");

-- CreateIndex
CREATE INDEX "impersonaciones_targetUserId_estado_idx" ON "impersonaciones"("targetUserId", "estado");

-- CreateIndex
CREATE INDEX "impersonaciones_soporteUserId_estado_idx" ON "impersonaciones"("soporteUserId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "organizaciones_nit_key" ON "organizaciones"("nit");

-- CreateIndex
CREATE INDEX "organizaciones_tipo_estadoPlan_idx" ON "organizaciones"("tipo", "estadoPlan");

-- CreateIndex
CREATE INDEX "membresias_organizacionId_rol_estado_idx" ON "membresias"("organizacionId", "rol", "estado");

-- CreateIndex
CREATE INDEX "membresias_userId_estado_idx" ON "membresias"("userId", "estado");

-- CreateIndex
CREATE INDEX "membresias_fincaId_idx" ON "membresias"("fincaId");

-- CreateIndex
CREATE INDEX "inversionistas_cuentaUserId_idx" ON "inversionistas"("cuentaUserId");

-- CreateIndex
CREATE INDEX "audit_log_organizacionId_createdAt_idx" ON "audit_log"("organizacionId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_recurso_recursoId_idx" ON "audit_log"("recurso", "recursoId");

-- AddForeignKey
ALTER TABLE "membresias" ADD CONSTRAINT "membresias_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "fincas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inversionistas" ADD CONSTRAINT "inversionistas_cuentaUserId_fkey" FOREIGN KEY ("cuentaUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_auth" ADD CONSTRAINT "tokens_auth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "fincas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_invitadaPorId_fkey" FOREIGN KEY ("invitadaPorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturacion" ADD CONSTRAINT "facturacion_organizacionId_fkey" FOREIGN KEY ("organizacionId") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonaciones" ADD CONSTRAINT "impersonaciones_soporteUserId_fkey" FOREIGN KEY ("soporteUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "impersonaciones" ADD CONSTRAINT "impersonaciones_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

