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
 * Lo decide el switch "Mostrar reseñas en la
 * web" del editor (campo `mostrarResenas`). Si el campo no
 * viene, se usa el valor por defecto de esta landing.
 */
import { mostrarResenasDe } from './ajustes';
import { obtenerFarmaciaPorSlug, SLUG_FARMACIA } from './contenido';

const farmacia = await obtenerFarmaciaPorSlug(SLUG_FARMACIA);

export const MOSTRAR_RESENAS: boolean = mostrarResenasDe(farmacia);
