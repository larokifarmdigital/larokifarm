/**
 * Chat de medicamentos (widget cima-chat): si sale y cómo se ve.
 *
 * Lo decide la sección «Chat de medicamentos»
 * del editor (solo administrador; campo `chat`). Si el campo
 * no viene, se usa lo que esta web tenía fijo (CHAT_POR_DEFECTO).
 */
import { chatDe } from './ajustes';
import { obtenerFarmaciaPorSlug, SLUG_FARMACIA } from './contenido';

export type { ChatWeb } from './ajustes';

const farmacia = await obtenerFarmaciaPorSlug(SLUG_FARMACIA);

export const CHAT = chatDe(farmacia);
