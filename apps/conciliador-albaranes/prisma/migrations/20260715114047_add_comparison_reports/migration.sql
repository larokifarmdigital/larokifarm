-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "comparison_reports" (
    "id" TEXT NOT NULL,
    "comparisonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" TEXT,
    "resolvedNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparison_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comparison_reports_comparisonId_status_idx" ON "comparison_reports"("comparisonId", "status");

-- CreateIndex
CREATE INDEX "comparison_reports_status_createdAt_idx" ON "comparison_reports"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "comparison_reports" ADD CONSTRAINT "comparison_reports_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "comparisons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_reports" ADD CONSTRAINT "comparison_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_reports" ADD CONSTRAINT "comparison_reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
