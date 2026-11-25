-- CreateEnum
CREATE TYPE "ScoutBatchStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "ScoutQueryStatus" AS ENUM ('PENDING', 'DONE', 'ERROR');

-- CreateEnum
CREATE TYPE "UsageModule" AS ENUM ('CONCILIADOR', 'SCOUT', 'CHATBOT');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "ciudad" TEXT,
ADD COLUMN     "descripcionCorta" JSONB,
ADD COLUMN     "descripcionLarga" JSONB,
ADD COLUMN     "direccion" JSONB,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "googleMapsUrl" TEXT,
ADD COLUMN     "horarios" JSONB,
ADD COLUMN     "idiomasActivos" JSONB,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "modules" JSONB,
ADD COLUMN     "numeroColegiado" TEXT,
ADD COLUMN     "plan" TEXT,
ADD COLUMN     "publishedStatus" TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN     "redesSociales" JSONB,
ADD COLUMN     "seoConfig" JSONB,
ADD COLUMN     "telefono" TEXT,
ADD COLUMN     "titular" TEXT,
ADD COLUMN     "web" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "scout_batch_jobs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ScoutBatchStatus" NOT NULL DEFAULT 'QUEUED',
    "totalQueries" INTEGER NOT NULL,
    "doneQueries" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "errorReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "scout_batch_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scout_batch_queries" (
    "id" TEXT NOT NULL,
    "batchJobId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "status" "ScoutQueryStatus" NOT NULL DEFAULT 'PENDING',
    "resultJson" JSONB,
    "errorMsg" TEXT,

    CONSTRAINT "scout_batch_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_entries" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "module" "UsageModule" NOT NULL,
    "action" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 1,
    "costUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_servicios" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "icono" TEXT,
    "nombre" JSONB NOT NULL,
    "descripcion" JSONB,
    "enlace" JSONB,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "content_servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_faqs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "pregunta" JSONB NOT NULL,
    "respuesta" JSONB NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "content_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_resenas" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "puntuacion" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "fuente" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "content_resenas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_images" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "alt" JSONB NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scout_batch_jobs_businessId_createdAt_idx" ON "scout_batch_jobs"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "scout_batch_jobs_userId_createdAt_idx" ON "scout_batch_jobs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "scout_batch_queries_batchJobId_idx" ON "scout_batch_queries"("batchJobId");

-- CreateIndex
CREATE INDEX "usage_entries_businessId_module_createdAt_idx" ON "usage_entries"("businessId", "module", "createdAt");

-- CreateIndex
CREATE INDEX "usage_entries_businessId_createdAt_idx" ON "usage_entries"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "content_servicios_businessId_orden_idx" ON "content_servicios"("businessId", "orden");

-- CreateIndex
CREATE INDEX "content_faqs_businessId_orden_idx" ON "content_faqs"("businessId", "orden");

-- CreateIndex
CREATE INDEX "content_resenas_businessId_fecha_idx" ON "content_resenas"("businessId", "fecha");

-- CreateIndex
CREATE INDEX "content_images_businessId_role_idx" ON "content_images"("businessId", "role");

-- AddForeignKey
ALTER TABLE "scout_batch_jobs" ADD CONSTRAINT "scout_batch_jobs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scout_batch_jobs" ADD CONSTRAINT "scout_batch_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scout_batch_queries" ADD CONSTRAINT "scout_batch_queries_batchJobId_fkey" FOREIGN KEY ("batchJobId") REFERENCES "scout_batch_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_entries" ADD CONSTRAINT "usage_entries_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_entries" ADD CONSTRAINT "usage_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_servicios" ADD CONSTRAINT "content_servicios_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_faqs" ADD CONSTRAINT "content_faqs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_resenas" ADD CONSTRAINT "content_resenas_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_images" ADD CONSTRAINT "content_images_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

