-- AlterTable
ALTER TABLE "comparisons" ADD COLUMN     "etiqueta" TEXT,
ADD COLUMN     "proveedor" TEXT;

-- CreateIndex
CREATE INDEX "comparisons_businessId_proveedor_idx" ON "comparisons"("businessId", "proveedor");
