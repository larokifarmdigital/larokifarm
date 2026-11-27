/** Ajustes del editor como funciones puras (sin red): los usan el build (publicado) y la vista previa (guardado). */
import type { Farmacia } from './contenido';

const MOSTRAR_RESENAS_POR_DEFECTO = true;

export function mostrarResenasDe(f: Pick<Farmacia, 'mostrarResenas'> | null | undefined): boolean {
  return f?.mostrarResenas ?? MOSTRAR_RESENAS_POR_DEFECTO;
}

export type ChatWeb = {
  activo: boolean;
  posicion: 'derecha' | 'izquierda';
  color: string;
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

export function chatDe(farmacia: Pick<Farmacia, 'chat'> | null | undefined): ChatWeb {
  const c: Partial<ChatWeb> = farmacia?.chat ?? {};
  return {
    activo: typeof c.activo === 'boolean' ? c.activo : CHAT_POR_DEFECTO.activo,
    posicion: c.posicion === 'izquierda' ? 'izquierda' : 'derecha',
    color: typeof c.color === 'string' && HEX.test(c.color) ? c.color : CHAT_POR_DEFECTO.color,
    nombre: typeof c.nombre === 'string' && c.nombre.trim() ? c.nombre.trim() : undefined,
    mostrarLogo: typeof c.mostrarLogo === 'boolean' ? c.mostrarLogo : CHAT_POR_DEFECTO.mostrarLogo,
    mostrarDisponible: typeof c.mostrarDisponible === 'boolean' ? c.mostrarDisponible : CHAT_POR_DEFECTO.mostrarDisponible,
  };
}
