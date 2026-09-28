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
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/farmacias', label: 'Farmacias', icon: 'Storefront', section: 'principal' },
  { href: '/scout', label: 'Scout precios', icon: 'MagnifyingGlass', section: 'operaciones', badge: 'nuevo' },
  { href: '/albaranes', label: 'Albaranes', icon: 'Receipt', section: 'operaciones', badge: 'nuevo' },
  { href: '/inventario', label: 'Inventario', icon: 'Package', section: 'operaciones', badge: 'wip' },
  { href: '/admin/uso', label: 'Uso', icon: 'Scales', section: 'sistema', requiresRole: 'admin', badge: 'nuevo' },
  { href: '/ajustes', label: 'Ajustes', icon: 'GearSix', section: 'sistema' },
];

export const SECTION_LABELS: Record<NavSection, string> = {
  principal: 'Principal',
  operaciones: 'Operaciones',
  sistema: 'Sistema',
};

// Filtra los items visibles para un role dado. Un item sin requiresRole lo ven todos.
export function visibleNavItems(role: NavRole | null): NavItem[] {
  return NAV_ITEMS.filter((i) => !i.requiresRole || i.requiresRole === role);
}
