-- Multi-organización (contexto de organización activa) — 1 columna nullable.
-- PURAMENTE ADITIVO, generado con `prisma migrate diff`. Sin DROP/RENAME/
-- TRUNCATE/DELETE FROM/SET NOT NULL/ALTER COLUMN. Las cuentas Campesino
-- existentes quedan en NULL y se atribuyen al dueño que las creó (ver
-- getEquipoResumen). Correr en Neon → SQL Editor ANTES de mergear el PR.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "creadoEnOrganizacionId" TEXT;

