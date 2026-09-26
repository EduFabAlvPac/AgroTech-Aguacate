-- AlterTable
ALTER TABLE "analisis_suelo" ADD COLUMN     "aluminio" DOUBLE PRECISION,
ADD COLUMN     "azufre" DOUBLE PRECISION,
ADD COLUMN     "boro" DOUBLE PRECISION,
ADD COLUMN     "calcio" DOUBLE PRECISION,
ADD COLUMN     "cic" DOUBLE PRECISION,
ADD COLUMN     "cobre" DOUBLE PRECISION,
ADD COLUMN     "cultivoId" TEXT,
ADD COLUMN     "etapa" "EtapaCultivo",
ADD COLUMN     "hierro" DOUBLE PRECISION,
ADD COLUMN     "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "magnesio" DOUBLE PRECISION,
ADD COLUMN     "manganeso" DOUBLE PRECISION,
ADD COLUMN     "profundidadCm" INTEGER,
ADD COLUMN     "sodio" DOUBLE PRECISION,
ADD COLUMN     "zinc" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "analisis_suelo_cultivoId_idx" ON "analisis_suelo"("cultivoId");

-- AddForeignKey
ALTER TABLE "analisis_suelo" ADD CONSTRAINT "analisis_suelo_cultivoId_fkey" FOREIGN KEY ("cultivoId") REFERENCES "cultivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

