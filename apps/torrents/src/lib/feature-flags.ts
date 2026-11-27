/** MOSTRAR_RESENAS (campo `mostrarResenas` del editor; si no viene, este valor) oculta la sección, los enlaces, el aggregateRating/review del JSON-LD y la ruta /resenas (404). */
import { mostrarResenasDe } from './ajustes';
import { obtenerFarmaciaPorSlug, SLUG_FARMACIA } from './contenido';

const farmacia = await obtenerFarmaciaPorSlug(SLUG_FARMACIA);

export const MOSTRAR_RESENAS: boolean = mostrarResenasDe(farmacia);
