import type { NavRole } from './navConfig';

/** Lo que el marco de la app (sidebar, topbar, menús) sabe del usuario. */
export type ShellInfo = {
  nombre: string;
  email: string;
  rol: NavRole;
  /** Personal de farmacia: su farmacia (para "Mi web" y "Ver mi web"). */
  miFarmacia?: { id: string; nombre: string; web?: string };
};
