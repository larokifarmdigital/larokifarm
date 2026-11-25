-- Reglas de publicación de reseñas (editor: cada una con su switch).
-- NULL = reglas por defecto en la app ({ minRating: 4, soloConComentario: true }),
-- que es lo que la portada de las landings tenía fijo en el código.
ALTER TABLE "businesses" ADD COLUMN "resenasReglas" JSONB;
