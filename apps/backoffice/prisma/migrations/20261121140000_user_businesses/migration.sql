-- Usuarios que llevan varias farmacias (mismo rol en todas).
-- Aditiva: crea la tabla de asignaciones y copia la farmacia actual de cada
-- usuario. `users.businessId` se mantiene como farmacia principal.
CREATE TABLE IF NOT EXISTS "user_businesses" (
  "userId"     TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_businesses_pkey" PRIMARY KEY ("userId", "businessId"),
  CONSTRAINT "user_businesses_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "user_businesses_businessId_fkey" FOREIGN KEY ("businessId")
    REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_businesses_businessId_idx"
  ON "user_businesses"("businessId");

INSERT INTO "user_businesses" ("userId", "businessId")
SELECT "id", "businessId" FROM "users" WHERE "businessId" IS NOT NULL
ON CONFLICT DO NOTHING;
