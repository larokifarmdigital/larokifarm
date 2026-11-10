-- DropIndex
DROP INDEX "content_images_businessId_role_idx";

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "avisoLegal" JSONB,
ADD COLUMN     "googleLocationName" TEXT,
ADD COLUMN     "heroChip" JSONB,
ADD COLUMN     "heroSubtitulo" JSONB,
ADD COLUMN     "heroTarjetasFlotantes" JSONB,
ADD COLUMN     "lastEditedByUserId" TEXT,
ADD COLUMN     "lastPublishedAt" TIMESTAMP(3),
ADD COLUMN     "mapaUrl" TEXT,
ADD COLUMN     "politicaPrivacidad" JSONB,
ADD COLUMN     "sobreNosotros" JSONB,
ADD COLUMN     "textosFaqs" JSONB,
ADD COLUMN     "textosResenas" JSONB,
ADD COLUMN     "textosServicios" JSONB;

-- AlterTable
ALTER TABLE "content_images" ADD COLUMN     "orden" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "content_features" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "icono" TEXT,
    "titulo" JSONB NOT NULL,
    "descripcion" JSONB,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "content_features_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_features_businessId_orden_idx" ON "content_features"("businessId", "orden");

-- CreateIndex
CREATE INDEX "content_images_businessId_role_orden_idx" ON "content_images"("businessId", "role", "orden");

-- AddForeignKey
ALTER TABLE "content_features" ADD CONSTRAINT "content_features_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
