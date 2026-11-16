-- Switch por farmacia: mostrar u ocultar la sección Reseñas en la landing.
ALTER TABLE "businesses" ADD COLUMN "mostrarResenas" BOOLEAN NOT NULL DEFAULT true;

-- Chamarro tenía las reseñas ocultas en código (MOSTRAR_RESENAS = false).
UPDATE "businesses" SET "mostrarResenas" = false WHERE "slug" = 'chamarro';
