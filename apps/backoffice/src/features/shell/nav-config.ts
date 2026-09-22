export type NavSection = 'principal' | 'operaciones' | 'sistema';

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  section: NavSection;
  badge?: 'nuevo' | 'wip';
};

export const NAV_ITEMS: NavItem[] = [
  { href: '/farmacias', label: 'Farmacias', icon: 'Storefront', section: 'principal' },
  { href: '/scout', label: 'Scout precios', icon: 'MagnifyingGlass', section: 'operaciones', badge: 'wip' },
  { href: '/albaranes', label: 'Albaranes', icon: 'Receipt', section: 'operaciones', badge: 'wip' },
  { href: '/inventario', label: 'Inventario', icon: 'Package', section: 'operaciones', badge: 'wip' },
  { href: '/ajustes', label: 'Ajustes', icon: 'GearSix', section: 'sistema' },
];

export const SECTION_LABELS: Record<NavSection, string> = {
  principal: 'Principal',
  operaciones: 'Operaciones',
  sistema: 'Sistema',
};
