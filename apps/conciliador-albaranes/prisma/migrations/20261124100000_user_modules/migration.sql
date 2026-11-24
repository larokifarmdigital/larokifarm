-- Módulos del backoffice que puede usar cada usuario (Ajustes → Usuarios).
-- Aditiva y re-ejecutable. Los usuarios que ya existen reciben CONCILIADOR
-- (nadie pierde acceso); los nuevos empiezan sin módulos.
DO $$ BEGIN
  CREATE TYPE "AppModule" AS ENUM ('CONCILIADOR', 'COMPARADOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "modules" "AppModule"[] NOT NULL
  DEFAULT ARRAY['CONCILIADOR']::"AppModule"[];

ALTER TABLE "users" ALTER COLUMN "modules" SET DEFAULT ARRAY[]::"AppModule"[];
