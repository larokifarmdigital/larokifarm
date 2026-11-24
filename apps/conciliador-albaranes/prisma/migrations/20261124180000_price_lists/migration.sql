-- Comparador de precios, Fase 3: listas subidas en Excel y su comparación
-- masiva (la procesa GitHub Actions). Aditiva y re-ejecutable.
DO $$ BEGIN
  CREATE TYPE "PriceListRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PriceListRunItemStatus" AS ENUM ('PENDING', 'DONE', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Las consultas hechas por una lista no salen en el historial de "Comparar precio".
ALTER TABLE "price_checks" ADD COLUMN IF NOT EXISTS "fromList" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "price_lists" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "itemCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "price_lists_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "price_lists_createdAt_idx" ON "price_lists"("createdAt");

CREATE TABLE IF NOT EXISTS "price_list_items" (
  "id" TEXT NOT NULL,
  "listId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "cn" TEXT NOT NULL,
  "ean" TEXT,
  "name" TEXT,
  CONSTRAINT "price_list_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "price_list_items_listId_fkey" FOREIGN KEY ("listId")
    REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "price_list_items_listId_position_idx" ON "price_list_items"("listId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "price_list_items_listId_cn_key" ON "price_list_items"("listId", "cn");

CREATE TABLE IF NOT EXISTS "price_list_runs" (
  "id" TEXT NOT NULL,
  "listId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "PriceListRunStatus" NOT NULL DEFAULT 'QUEUED',
  "total" INTEGER NOT NULL,
  "done" INTEGER NOT NULL DEFAULT 0,
  "verified" INTEGER NOT NULL DEFAULT 0,
  "errorReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "heartbeatAt" TIMESTAMP(3),
  CONSTRAINT "price_list_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "price_list_runs_listId_fkey" FOREIGN KEY ("listId")
    REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "price_list_runs_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "price_list_runs_listId_createdAt_idx" ON "price_list_runs"("listId", "createdAt");
CREATE INDEX IF NOT EXISTS "price_list_runs_status_idx" ON "price_list_runs"("status");

CREATE TABLE IF NOT EXISTS "price_list_run_items" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "status" "PriceListRunItemStatus" NOT NULL DEFAULT 'PENDING',
  "checkId" TEXT,
  "reused" BOOLEAN NOT NULL DEFAULT false,
  "error" TEXT,
  CONSTRAINT "price_list_run_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "price_list_run_items_runId_fkey" FOREIGN KEY ("runId")
    REFERENCES "price_list_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "price_list_run_items_itemId_fkey" FOREIGN KEY ("itemId")
    REFERENCES "price_list_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "price_list_run_items_checkId_fkey" FOREIGN KEY ("checkId")
    REFERENCES "price_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "price_list_run_items_runId_status_idx" ON "price_list_run_items"("runId", "status");
CREATE INDEX IF NOT EXISTS "price_list_run_items_checkId_idx" ON "price_list_run_items"("checkId");
CREATE UNIQUE INDEX IF NOT EXISTS "price_list_run_items_runId_itemId_key" ON "price_list_run_items"("runId", "itemId");
