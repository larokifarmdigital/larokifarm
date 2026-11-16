/**
 * Banderas de funcionalidad de Chamarro.
 *
 * MOSTRAR_RESENAS controla la visibilidad de la sección "Reseñas Google" en
 * toda la landing. Cuando es false oculta:
 *  - la sección dentro del index
 *  - los enlaces "Reseñas" del Header (nav desktop + hamburguesa) y del Footer
 *  - aggregateRating + review del JSON-LD de SEO
 *  - la ruta /resenas devuelve 404
 *
 * Con CONTENT_SOURCE=backoffice lo decide el switch "Mostrar reseñas en la
 * web" del editor (campo `mostrarResenas`). Con Sanity, o si el campo no
 * viene, se usa el valor por defecto de esta landing.
 */
import { obtenerFarmaciaPorSlug, SLUG_FARMACIA } from './sanity';

const MOSTRAR_RESENAS_POR_DEFECTO = false;

const farmacia = await obtenerFarmaciaPorSlug(SLUG_FARMACIA);

export const MOSTRAR_RESENAS: boolean = farmacia?.mostrarResenas ?? MOSTRAR_RESENAS_POR_DEFECTO;
