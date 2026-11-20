export type NavRole = 'admin' | 'manager' | 'viewer';

export type NavChild = { href: string; label: string };

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: 'nuevo' | 'wip';
  /** Si se define, solo los usuarios con ese rol ven el item. */
  requiresRole?: NavRole;
  /** Sub-apartados (se muestran siempre debajo del item, sin desplegable). */
  children?: NavChild[];
  /**
   * Si es true, el item se oculta del menú aunque la ruta exista: flujos en
   * obra que todavía no están listos. La ruta sigue accesible por URL.
   */
  hidden?: boolean;
};

/** Contexto que decide qué ve cada usuario en el menú. */
export type NavContext = {
  role: NavRole | null;
  /** Personal de farmacia: id de SU farmacia → "Mi web" va directo al editor. */
  miFarmaciaId?: string;
};

/**
 * Menú del backoffice. Sin títulos de sección mientras haya pocos items.
 * - Admin: "Farmacias" (listado de todas).
 * - Personal de farmacia: "Mi web" (directo al editor de su farmacia).
 * - "Albaranes" (antes "Conciliador": es la palabra del mostrador).
 */
export function buildNav({ role, miFarmaciaId }: NavContext): NavItem[] {
  const web: NavItem =
    role === 'admin' || !miFarmaciaId
      ? { href: '/farmacias', label: 'Farmacias', icon: 'Storefront' }
      : { href: `/farmacias/${miFarmaciaId}`, label: 'Mi web', icon: 'Storefront' };

  const items: NavItem[] = [
    { href: '/inicio', label: 'Inicio', icon: 'House' },
    web,
    {
      href: '/albaranes',
      label: 'Albaranes',
      icon: 'Receipt',
      children: [
        { href: '/albaranes', label: 'Nueva conciliación' },
        { href: '/albaranes/historial', label: 'Historial' },
      ],
    },
    // En obra: ocultos hasta que estén listos (siguen accesibles por URL).
    { href: '/scout', label: 'Scout precios', icon: 'MagnifyingGlass', badge: 'nuevo', hidden: true },
    { href: '/inventario', label: 'Inventario', icon: 'Package', badge: 'wip', hidden: true },
    { href: '/admin/uso', label: 'Uso', icon: 'Scales', requiresRole: 'admin', badge: 'nuevo', hidden: true },
    { href: '/ajustes', label: 'Ajustes', icon: 'GearSix', hidden: true },
  ];

  return items.filter((i) => !i.hidden && (!i.requiresRole || i.requiresRole === role));
}

/** Todas las rutas del menú (items + sub-apartados) para resolver el activo. */
function todasLasRutas(items: NavItem[]): string[] {
  return items.flatMap((i) => [i.href, ...(i.children ?? []).map((c) => c.href)]);
}

/**
 * Activo = la ruta más específica que coincide, así /albaranes no se marca
 * estando en /albaranes/historial.
 */
export function isNavHrefActive(href: string, pathname: string, items: NavItem[]): boolean {
  const matches = (h: string) => pathname === h || pathname.startsWith(`${h}/`);
  if (!matches(href)) return false;
  return !todasLasRutas(items).some((h) => h !== href && h.startsWith(`${href}/`) && matches(h));
}

/** Un item padre se marca activo si lo está él o cualquiera de sus hijos. */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const matches = (h: string) => pathname === h || pathname.startsWith(`${h}/`);
  return matches(item.href) || (item.children ?? []).some((c) => matches(c.href));
}

/** Rol en lenguaje llano para personal no técnico. */
export const ROL_LABEL: Record<NavRole, string> = {
  admin: 'Administrador',
  manager: 'Responsable de farmacia',
  viewer: 'Solo consulta',
};
