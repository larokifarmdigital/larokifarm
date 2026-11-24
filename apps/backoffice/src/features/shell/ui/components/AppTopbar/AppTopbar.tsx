'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { UserMenu } from '@/features/shell/ui/components/UserMenu';
import { MobileNavDrawer } from '@/features/shell/ui/components/MobileNavDrawer';
import { useSidebar } from '@/features/shell/ui/components/SidebarProvider';
import type { ShellInfo } from '@/features/shell/ui/lib/shellInfo';
import { cn } from '@/shared/lib/cn';

type Crumb = { label: string; href?: string };

const ES_ID = /^c[a-z0-9]{20,}$/;

/** Migas por ruta conocida (sin casa: "Inicio" ya está en el menú). */
function buildCrumbs(pathname: string, shell: ShellInfo): Crumb[] {
  const s = pathname.split('/').filter(Boolean);
  const esAdmin = shell.rol === 'admin';
  switch (s[0]) {
    case 'inicio':
      return [{ label: 'Inicio' }];
    case 'farmacias':
      if (s.length === 1) return [{ label: 'Farmacias' }];
      if (s[1] === 'nueva') return [{ label: 'Farmacias', href: '/farmacias' }, { label: 'Nueva farmacia' }];
      if (ES_ID.test(s[1] ?? '')) {
        return esAdmin
          ? [{ label: 'Farmacias', href: '/farmacias' }, { label: 'Editar farmacia' }]
          : [{ label: 'Mi web' }];
      }
      break;
    case 'ajustes':
      return [{ label: 'Usuarios' }];
    case 'albaranes':
      if (s.length === 1) return [{ label: 'Albaranes', href: '/albaranes' }, { label: 'Nueva conciliación' }];
      if (s[1] === 'historial') {
        return s.length === 2
          ? [{ label: 'Albaranes', href: '/albaranes' }, { label: 'Historial' }]
          : [
              { label: 'Albaranes', href: '/albaranes' },
              { label: 'Historial', href: '/albaranes/historial' },
              { label: 'Detalle' },
            ];
      }
      break;
    case 'scout':
      if (s.length === 1) return [{ label: 'Precios', href: '/scout' }, { label: 'Comparar precio' }];
      if (s[1] === 'historial') {
        return s.length === 2
          ? [{ label: 'Precios', href: '/scout' }, { label: 'Historial' }]
          : [
              { label: 'Precios', href: '/scout' },
              { label: 'Historial', href: '/scout/historial' },
              { label: 'Detalle' },
            ];
      }
      break;
  }
  return s.map((seg, i) => ({
    label: decodeURIComponent(seg),
    href: i === s.length - 1 ? undefined : `/${s.slice(0, i + 1).join('/')}`,
  }));
}

export function AppTopbar({ shell }: { shell: ShellInfo }) {
  const pathname = usePathname();
  const crumbs = useMemo(() => buildCrumbs(pathname, shell), [pathname, shell]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const abrirMenuRef = useRef<HTMLButtonElement>(null);
  const { collapsed, toggle } = useSidebar();
  // En el editor de una farmacia, en móvil, el editor ya tiene su propia
  // cabecera fija: la de la app hace scroll para no apilar dos barras fijas.
  const enEditor = /^\/farmacias\/c[a-z0-9]{20,}/.test(pathname);

  return (
    <>
      <header
        className={cn(
          'top-0 z-30 bg-[var(--color-bg)]/90 backdrop-blur border-b border-[var(--color-hairline)]',
          enEditor ? 'relative lg:sticky' : 'sticky',
        )}
      >
        <div className="h-14 flex items-center gap-2 px-3 sm:px-6">
          <button
            ref={abrirMenuRef}
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menú"
            className="lg:hidden flex h-11 w-11 items-center justify-center rounded-[8px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] transition-colors"
          >
            <NavIcon name="List" size={20} />
          </button>

          <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Menú lateral"
                  aria-expanded={!collapsed}
                  className="hidden lg:flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] transition-colors"
                >
                  <NavIcon name="SidebarSimple" size={17} weight={collapsed ? 'fill' : 'regular'} />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="bottom"
                  sideOffset={6}
                  className="bg-[var(--color-ink)] text-white text-[12px] px-2 py-1 rounded-[4px]"
                >
                  {collapsed ? 'Expandir menú' : 'Colapsar menú'}
                  <Tooltip.Arrow className="fill-[var(--color-ink)]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>

          <nav aria-label="Ruta de navegación" className="flex-1 min-w-0">
            <ol className="flex items-center gap-1.5 text-[14px] text-[var(--color-muted)] min-w-0">
              {crumbs.map((c, i) => {
                const ultimo = i === crumbs.length - 1;
                return (
                  <li
                    key={i}
                    // En móvil solo se ve la pantalla actual (sin flechas sueltas)
                    className={cn('items-center gap-1.5 min-w-0', ultimo ? 'flex' : 'hidden sm:flex')}
                  >
                    {i > 0 && (
                      <NavIcon
                        name="CaretRight"
                        size={11}
                        className="hidden sm:block text-[var(--color-muted-2)] shrink-0"
                      />
                    )}
                    {c.href ? (
                      <Link
                        href={c.href}
                        className="py-2 hover:text-[var(--color-ink)] transition-colors truncate max-w-[200px]"
                      >
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current="page" className="text-[var(--color-ink)] font-semibold truncate">
                        {c.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>

          <UserMenu shell={shell} />
        </div>
      </header>

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        shell={shell}
        devolverFocoA={abrirMenuRef}
      />
    </>
  );
}
