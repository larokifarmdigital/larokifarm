-- AlterTable
ALTER TABLE "content_resenas" ADD COLUMN     "avatarStorageKey" TEXT,
ADD COLUMN     "destacada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "eliminadaEnGoogle" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleReviewId" TEXT,
ADD COLUMN     "oculta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "respuesta" TEXT,
ADD COLUMN     "respuestaFecha" TIMESTAMP(3),
ADD COLUMN     "textoIdioma" TEXT,
ALTER COLUMN "texto" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "content_resenas_businessId_googleReviewId_key" ON "content_resenas"("businessId", "googleReviewId");

