-- Comparador de precios del backoffice (/scout): consultas y resultado por
-- farmacia online. Aditiva y re-ejecutable: solo crea tipos, tablas e índices.
DO $$ BEGIN
  CREATE TYPE "PriceProductType" AS ENUM ('RECETA', 'SIN_RECETA', 'PARAFARMACIA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PriceOfferStatus" AS ENUM ('VERIFIED', 'NO_CODE', 'NOT_FOUND', 'BLOCKED', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "price_checks" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "query" TEXT NOT NULL,
  "cn" TEXT NOT NULL,
  "ean" TEXT,
  "productName" TEXT NOT NULL,
  "productType" "PriceProductType" NOT NULL,
  "officialPrice" DECIMAL(10,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "price_checks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "price_checks_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "price_checks_createdAt_idx" ON "price_checks"("createdAt");
CREATE INDEX IF NOT EXISTS "price_checks_cn_idx" ON "price_checks"("cn");

CREATE TABLE IF NOT EXISTS "price_offers" (
  "id" TEXT NOT NULL,
  "checkId" TEXT NOT NULL,
  "pharmacy" TEXT NOT NULL,
  "status" "PriceOfferStatus" NOT NULL,
  "price" DECIMAL(10,2),
  "previousPrice" DECIMAL(10,2),
  "url" TEXT,
  "productName" TEXT,
  "note" TEXT,
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "price_offers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "price_offers_checkId_fkey" FOREIGN KEY ("checkId")
    REFERENCES "price_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "price_offers_checkId_pharmacy_key" ON "price_offers"("checkId", "pharmacy");
