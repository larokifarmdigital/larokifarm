/** Visibilidad de las reseñas en toda la web (sección, enlaces, JSON-LD y ruta /resenas). Lo decide `mostrarResenas` del editor; sin valor, el de esta landing. */
import { obtenerFarmaciaPorSlug, SLUG_FARMACIA } from './contenido';

const MOSTRAR_RESENAS_POR_DEFECTO = false;

const farmacia = await obtenerFarmaciaPorSlug(SLUG_FARMACIA);

export const MOSTRAR_RESENAS: boolean = farmacia?.mostrarResenas ?? MOSTRAR_RESENAS_POR_DEFECTO;
