/**
 * Chat de medicamentos (widget cima-chat): si sale y cómo se ve.
 *
 * Con CONTENT_SOURCE=backoffice lo decide la sección «Chat de medicamentos»
 * del editor (solo administrador; campo `chat`). Con Sanity, o si el campo
 * no viene, se usa lo que esta web tenía fijo (CHAT_POR_DEFECTO).
 */
import { obtenerFarmaciaPorSlug, SLUG_FARMACIA } from './sanity';

export type ChatWeb = {
  activo: boolean;
  posicion: 'derecha' | 'izquierda';
  /** Color principal del chat (#rrggbb). */
  color: string;
  /** Vacío = el nombre de la farmacia. */
  nombre?: string;
  mostrarLogo: boolean;
  mostrarDisponible: boolean;
};

const CHAT_POR_DEFECTO: ChatWeb = {
  activo: true,
  posicion: 'derecha',
  color: '#1265b5',
  mostrarLogo: true,
  mostrarDisponible: true,
};

const HEX = /^#[0-9a-f]{6}$/i;

const farmacia = await obtenerFarmaciaPorSlug(SLUG_FARMACIA);
const c: Partial<ChatWeb> = farmacia?.chat ?? {};

export const CHAT: ChatWeb = {
  activo: typeof c.activo === 'boolean' ? c.activo : CHAT_POR_DEFECTO.activo,
  posicion: c.posicion === 'izquierda' ? 'izquierda' : 'derecha',
  color: typeof c.color === 'string' && HEX.test(c.color) ? c.color : CHAT_POR_DEFECTO.color,
  nombre: typeof c.nombre === 'string' && c.nombre.trim() ? c.nombre.trim() : undefined,
  mostrarLogo: typeof c.mostrarLogo === 'boolean' ? c.mostrarLogo : CHAT_POR_DEFECTO.mostrarLogo,
  mostrarDisponible: typeof c.mostrarDisponible === 'boolean' ? c.mostrarDisponible : CHAT_POR_DEFECTO.mostrarDisponible,
};
