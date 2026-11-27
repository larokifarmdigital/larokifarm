/** Chat cima-chat: lo decide el editor (campo `chat`); si no viene, se usa CHAT_POR_DEFECTO. */
import { chatDe } from './ajustes';
import { obtenerFarmaciaPorSlug, SLUG_FARMACIA } from './contenido';

export type { ChatWeb } from './ajustes';

const farmacia = await obtenerFarmaciaPorSlug(SLUG_FARMACIA);

export const CHAT = chatDe(farmacia);
