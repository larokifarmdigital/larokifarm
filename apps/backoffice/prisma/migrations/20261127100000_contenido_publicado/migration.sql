-- Copia del contenido de la farmacia en el momento de publicar. Sirve para:
--   1) que la API pública (las landings) sirva lo PUBLICADO y no lo guardado:
--      reconstruir la web por otro motivo ya no publica cambios a medias;
--   2) que el editor marque qué campos tienen cambios sin publicar.
-- NULL = aún no se ha publicado con esta versión: se usa lo guardado, como antes.
-- Aditiva y re-ejecutable.
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "contenidoPublicado" JSONB;
