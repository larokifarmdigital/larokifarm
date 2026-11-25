-- Ajustes del chat de medicamentos de cada web. Aditiva: null = como hasta ahora.
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "chatConfig" JSONB;
