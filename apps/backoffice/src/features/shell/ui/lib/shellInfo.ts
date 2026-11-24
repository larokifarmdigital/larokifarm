import type { Modulo } from '@/core/shared';
import type { NavRole } from './navConfig';

/** Lo que el marco de la app (sidebar, topbar, menús) sabe del usuario. */
export type ShellInfo = {
  nombre: string;
  email: string;
  rol: NavRole;
  /** Personal de farmacia: su farmacia (para "Mi web" y "Ver mi web"). */
  miFarmacia?: { id: string; nombre: string; web?: string };
  /** Personal que lleva varias farmacias: sus nombres (sin `miFarmacia`). */
  misFarmacias?: string[];
  /** Módulos que puede usar (el administrador, todos). */
  modulos: Modulo[];
};
