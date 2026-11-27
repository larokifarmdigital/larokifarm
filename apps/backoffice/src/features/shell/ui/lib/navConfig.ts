import type { Modulo } from '@/core/shared';

export type NavRole = 'admin' | 'manager' | 'viewer';

export type NavChild = { href: string; label: string };

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: 'nuevo' | 'wip';
  /** Si se define, solo los usuarios con ese rol ven el item. */
  requiresRole?: NavRole;
  /** Si se define, solo lo ven quienes tienen ese módulo activado. */
  requiresModulo?: Modulo;
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
  /** Personal con varias farmacias: "Mis webs" lleva a su lista. */
  variasFarmacias?: boolean;
  /** Módulos que puede usar (el administrador, todos). */
  modulos: readonly Modulo[];
};

/** Sin títulos de sección mientras haya pocos items. */
export function buildNav({ role, miFarmaciaId, variasFarmacias, modulos }: NavContext): NavItem[] {
  const web: NavItem =
    role !== 'admin' && miFarmaciaId
      ? { href: `/farmacias/${miFarmaciaId}`, label: 'Mi web', icon: 'Storefront' }
      : role !== 'admin' && variasFarmacias
        ? { href: '/farmacias', label: 'Mis webs', icon: 'Storefront' }
        : { href: '/farmacias', label: 'Farmacias', icon: 'Storefront' };

  const items: NavItem[] = [
    { href: '/inicio', label: 'Inicio', icon: 'House' },
    // Sin "Editar la web" (viewer) no hay web en el backoffice.
    ...(role === 'viewer' ? [] : [web]),
    {
      href: '/albaranes',
      label: 'Albaranes',
      icon: 'Receipt',
      requiresModulo: 'conciliador',
      children: [
        { href: '/albaranes', label: 'Nueva conciliación' },
        { href: '/albaranes/historial', label: 'Historial' },
      ],
    },
    // En obra: ocultos hasta que estén listos (siguen accesibles por URL).
    {
      href: '/scout',
      label: 'Precios',
      icon: 'Tag',
      requiresModulo: 'comparador',
      children: [
        { href: '/scout', label: 'Comparar precio' },
        { href: '/scout/historial', label: 'Historial' },
        { href: '/scout/listas', label: 'Listas' },
      ],
    },
    { href: '/inventario', label: 'Inventario', icon: 'Package', badge: 'wip', hidden: true },
    { href: '/admin/uso', label: 'Uso de IA', icon: 'Sparkle', requiresRole: 'admin' },
    { href: '/ajustes/usuarios', label: 'Usuarios', icon: 'UsersThree', requiresRole: 'admin' },
  ];

  return items.filter(
    (i) =>
      !i.hidden &&
      (!i.requiresRole || i.requiresRole === role) &&
      (!i.requiresModulo || modulos.includes(i.requiresModulo)),
  );
}

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
