-- CreateEnum
CREATE TYPE "ComparisonStatus" AS ENUM ('OK', 'DISCREPANCIAS', 'ERROR');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('PDF_INPUT', 'XLSX_INPUT', 'REPORT_OUTPUT');

-- CreateTable
CREATE TABLE "comparisons" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL,
    "status" "ComparisonStatus" NOT NULL,
    "numPairs" INTEGER NOT NULL,
    "numPdfs" INTEGER NOT NULL,
    "numXlsx" INTEGER NOT NULL,
    "numDiscrepancias" INTEGER NOT NULL DEFAULT 0,
    "geminiInputTokens" INTEGER NOT NULL DEFAULT 0,
    "geminiOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "geminiCostUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "summary" JSONB NOT NULL,

    CONSTRAINT "comparisons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comparison_files" (
    "id" TEXT NOT NULL,
    "comparisonId" TEXT NOT NULL,
    "kind" "FileKind" NOT NULL,
    "filename" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparison_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comparisons_businessId_createdAt_idx" ON "comparisons"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "comparisons_userId_createdAt_idx" ON "comparisons"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "comparison_files_comparisonId_idx" ON "comparison_files"("comparisonId");

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparisons" ADD CONSTRAINT "comparisons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_files" ADD CONSTRAINT "comparison_files_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
