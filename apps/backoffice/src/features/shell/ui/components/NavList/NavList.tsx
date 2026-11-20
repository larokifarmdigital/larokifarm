'use client';

import Link from 'next/link';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  isNavHrefActive,
  isNavItemActive,
  type NavItem,
} from '@/features/shell/ui/lib/navConfig';
import { NavIcon, type IconName } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

/**
 * Lista de navegación compartida por el sidebar (escritorio) y el drawer
 * (móvil), para que nunca se desincronicen.
 * - `variant="drawer"`: objetivos de 44px (dedo).
 * - `collapsed`: solo iconos con tooltip; un item con sub-apartados abre un
 *   menú con ellos (si no, "Historial" sería inalcanzable con el menú plegado).
 */
export function NavList({
  items,
  pathname,
  variant = 'sidebar',
  collapsed = false,
}: {
  items: NavItem[];
  pathname: string;
  variant?: 'sidebar' | 'drawer';
  collapsed?: boolean;
}) {
  const drawer = variant === 'drawer';

  return (
    <ul className={cn(drawer ? 'space-y-1' : 'space-y-0.5')}>
      {items.map((item) => {
        const tieneHijos = Boolean(item.children?.length) && !collapsed;
        const padreActivo = isNavItemActive(item, pathname);
        // Con hijos, el padre solo es "página actual" si ninguno de sus hijos lo es.
        const padreEsPagina = !tieneHijos && isNavHrefActive(item.href, pathname, items);

        // Plegado + sub-apartados: el icono abre un menú con los hijos.
        if (collapsed && item.children?.length) {
          return (
            <li key={item.href}>
              <DropdownMenu.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <DropdownMenu.Trigger
                      aria-label={item.label}
                      // Con el menú cerrado, indica que la página actual está en este apartado
                      aria-current={padreActivo ? 'page' : undefined}
                      className={cn(
                        'flex h-10 w-10 mx-auto items-center justify-center rounded-[8px] transition-colors duration-100',
                        padreActivo
                          ? 'bg-[var(--color-surface)] shadow-[var(--shadow-hairline)]'
                          : 'hover:bg-[var(--color-surface)]',
                      )}
                    >
                      <NavIcon
                        name={item.icon as IconName}
                        size={18}
                        weight={padreActivo ? 'fill' : 'regular'}
                        className={padreActivo ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}
                      />
                    </DropdownMenu.Trigger>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="right"
                      sideOffset={8}
                      className="bg-[var(--color-ink)] text-white text-[12px] px-2 py-1 rounded-[4px] shadow-[var(--shadow-elevated)]"
                    >
                      {item.label}
                      <Tooltip.Arrow className="fill-[var(--color-ink)]" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    side="right"
                    align="start"
                    sideOffset={8}
                    className="min-w-[200px] bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[10px] shadow-[var(--shadow-elevated)] p-1.5 z-50 outline-none"
                  >
                    <DropdownMenu.Label className="px-2.5 py-1.5 text-[12px] font-semibold text-[var(--color-muted)]">
                      {item.label}
                    </DropdownMenu.Label>
                    {item.children.map((hijo) => {
                      const activo = isNavHrefActive(hijo.href, pathname, items);
                      return (
                        <DropdownMenu.Item key={hijo.href} asChild>
                          <Link
                            href={hijo.href}
                            aria-current={activo ? 'page' : undefined}
                            className={cn(
                              'flex items-center min-h-10 px-2.5 rounded-[6px] text-[14px] outline-none cursor-pointer',
                              activo
                                ? 'text-[var(--color-accent-ink)] font-medium bg-[var(--color-accent-soft)]'
                                : 'text-[var(--color-ink-2)] data-[highlighted]:bg-[var(--color-surface-2)]',
                            )}
                          >
                            {hijo.label}
                          </Link>
                        </DropdownMenu.Item>
                      );
                    })}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </li>
          );
        }

        const enlace = (
          <Link
            href={item.href}
            aria-current={padreEsPagina ? 'page' : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={cn(
              'group flex items-center rounded-[8px] transition-colors duration-100',
              collapsed
                ? 'h-10 w-10 justify-center mx-auto'
                : drawer
                  ? 'min-h-11 px-3 gap-3 text-[15px]'
                  : 'min-h-9 px-2.5 gap-2.5 text-[14px]',
              padreActivo
                ? 'bg-[var(--color-surface)] text-[var(--color-ink)] font-medium shadow-[var(--shadow-hairline)]'
                : 'text-[var(--color-ink-2)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]',
            )}
          >
            <NavIcon
              name={item.icon as IconName}
              size={collapsed ? 18 : drawer ? 18 : 16}
              weight={padreActivo ? 'fill' : 'regular'}
              className={padreActivo ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}
            />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          </Link>
        );

        return (
          <li key={item.href}>
            {collapsed ? (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>{enlace}</Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="right"
                    sideOffset={8}
                    className="bg-[var(--color-ink)] text-white text-[12px] px-2 py-1 rounded-[4px] shadow-[var(--shadow-elevated)]"
                  >
                    {item.label}
                    <Tooltip.Arrow className="fill-[var(--color-ink)]" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            ) : (
              enlace
            )}

            {tieneHijos && (
              <ul
                className={cn(
                  'mt-0.5 space-y-0.5 border-l border-[var(--color-hairline)]',
                  drawer ? 'ml-[21px] pl-3' : 'ml-[18px] pl-2.5',
                )}
              >
                {item.children!.map((hijo) => {
                  const activo = isNavHrefActive(hijo.href, pathname, items);
                  return (
                    <li key={hijo.href}>
                      <Link
                        href={hijo.href}
                        aria-current={activo ? 'page' : undefined}
                        className={cn(
                          'flex items-center rounded-[6px] transition-colors duration-100',
                          drawer ? 'min-h-11 px-3 text-[14.5px]' : 'min-h-8 px-2.5 text-[13.5px]',
                          activo
                            ? 'text-[var(--color-accent-ink)] font-medium bg-[var(--color-accent-soft)]'
                            : 'text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)]',
                        )}
                      >
                        {hijo.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
