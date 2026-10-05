export type NavSection = 'principal' | 'operaciones' | 'sistema';

export type NavRole = 'admin' | 'manager' | 'viewer';

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  section: NavSection;
  badge?: 'nuevo' | 'wip';
  /** Si se define, solo los usuarios con ese rol ven el item. */
  requiresRole?: NavRole;
  /**
   * Si es true, el item se oculta del sidebar aunque la ruta exista.
   * Lo usamos para flujos WIP que todavía no están listos para producción.
   * La ruta sigue accesible por URL directa.
   */
  hidden?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/farmacias', label: 'Farmacias', icon: 'Storefront', section: 'principal' },
  // WIP ocultos del sidebar hasta que estén listos. Siguen accesibles por URL.
  { href: '/scout', label: 'Scout precios', icon: 'MagnifyingGlass', section: 'operaciones', badge: 'nuevo', hidden: true },
  { href: '/albaranes', label: 'Albaranes', icon: 'Receipt', section: 'operaciones', badge: 'nuevo', hidden: true },
  { href: '/inventario', label: 'Inventario', icon: 'Package', section: 'operaciones', badge: 'wip', hidden: true },
  { href: '/admin/uso', label: 'Uso', icon: 'Scales', section: 'sistema', requiresRole: 'admin', badge: 'nuevo', hidden: true },
  { href: '/ajustes', label: 'Ajustes', icon: 'GearSix', section: 'sistema' },
];

export const SECTION_LABELS: Record<NavSection, string> = {
  principal: 'Principal',
  operaciones: 'Operaciones',
  sistema: 'Sistema',
};

// Filtra los items visibles para un role dado. Un item sin requiresRole lo ven todos.
// Items con `hidden: true` nunca aparecen en el sidebar (siguen accesibles por URL).
export function visibleNavItems(role: NavRole | null): NavItem[] {
  return NAV_ITEMS.filter(
    (i) => !i.hidden && (!i.requiresRole || i.requiresRole === role),
  );
}
