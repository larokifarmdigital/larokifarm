/**
 * Banderas de funcionalidad de Torrents.
 *
 * MOSTRAR_RESENAS controla la visibilidad de la sección "Reseñas Google" en
 * toda la landing. Cuando es false oculta:
 *  - la sección dentro del index
 *  - los enlaces "Reseñas" del Header (nav desktop + hamburguesa) y del Footer
 *  - aggregateRating + review del JSON-LD de SEO
 *  - la ruta /resenas devuelve 404
 *
 * Cambiar a true cuando Google apruebe la solicitud de Business Profile API
 * (caso de soporte #4-0062000040429 enviado 2026-05-26, espera 7-10 días hábiles).
 */
export const MOSTRAR_RESENAS = false;
