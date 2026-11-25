-- Sugerencias de traducción con IA del backoffice: su coste se registra en
-- usage_entries y cuenta en el presupuesto mensual del negocio.
-- Aditiva: solo añade un valor al enum.
ALTER TYPE "UsageModule" ADD VALUE IF NOT EXISTS 'TRADUCCION';
