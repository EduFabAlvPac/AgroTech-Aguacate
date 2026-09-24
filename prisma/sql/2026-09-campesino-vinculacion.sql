-- Login Campesino seguro (código de vinculación del dueño + dispositivo de confianza).
-- PURAMENTE ADITIVO: 1 columna con DEFAULT + 2 tablas nuevas. Generado con
-- `prisma migrate diff` (no escrito a mano). Sin DROP/RENAME/TRUNCATE/DELETE
-- FROM/SET NOT NULL/ALTER COLUMN. Las cuentas Campesino existentes quedan con
-- requiereVinculacion = false y siguen entrando exactamente como hoy.
-- Correr en Neon → SQL Editor ANTES de mergear el PR.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "requiereVinculacion" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "codigos_vinculacion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "creadoPorId" TEXT,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "invalidadoEn" TIMESTAMP(3),
    "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_vinculacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivos_confianza" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "ultimoUsoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "revocadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispositivos_confianza_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "codigos_vinculacion_userId_usadoEn_idx" ON "codigos_vinculacion"("userId", "usadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_confianza_tokenHash_key" ON "dispositivos_confianza"("tokenHash");

-- CreateIndex
CREATE INDEX "dispositivos_confianza_userId_revocadoEn_idx" ON "dispositivos_confianza"("userId", "revocadoEn");

-- AddForeignKey
ALTER TABLE "codigos_vinculacion" ADD CONSTRAINT "codigos_vinculacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivos_confianza" ADD CONSTRAINT "dispositivos_confianza_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
