/**
 * Banderas de funcionalidad de Torrents.
 *
 * MOSTRAR_RESENAS controla la visibilidad de la sección "Reseñas Google" en
 * toda la landing. Cuando es false oculta:
 *  - la sección dentro del index
 *  - los enlaces "Reseñas" del Header (nav desktop + hamburguesa) y del Footer
 *  - aggregateRating + review del JSON-LD de SEO
 *  - la ruta /resenas devuelve 404
 */
export const MOSTRAR_RESENAS = true;
