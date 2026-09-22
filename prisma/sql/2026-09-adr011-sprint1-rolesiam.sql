-- ADR-011 Sprint 1 — columna aditiva nueva (Membresia.rolesIam).
-- Generado con: npx prisma migrate diff --from-schema-datamodel <main> --to-schema-datamodel prisma/schema.prisma --script
-- Verificado: solo ADD COLUMN, sin DROP/RENAME/TRUNCATE/DELETE FROM/SET NOT NULL/ALTER COLUMN.
--
-- Nota: TokenAuth y Sesion (tablas que usa el resto del Sprint 1 — tokens
-- hasheados y sesiones revocables) ya existen en producción desde el PR #50
-- (docs/ADR-011-notas-de-implementacion.md), así que no vuelven a aparecer
-- acá.

-- AlterTable
ALTER TABLE "membresias" ADD COLUMN     "rolesIam" "Rol"[] DEFAULT ARRAY[]::"Rol"[];
