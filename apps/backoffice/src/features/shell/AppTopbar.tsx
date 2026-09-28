'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { NavIcon } from './NavIcon';
import { UserMenu } from './UserMenu';
import { MobileNavDrawer } from './MobileNavDrawer';
import { CommandStub } from './CommandStub';
import { useSidebar } from './SidebarProvider';
import type { Usuario } from '@/types/content';
import { NAV_ITEMS } from './nav-config';

type Crumb = { label: string; href?: string };

function buildCrumbs(pathname: string): Crumb[] {
  const segs = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [];
  let acc = '';
  for (let i = 0; i < segs.length; i++) {
    acc += `/${segs[i]}`;
    const nav = NAV_ITEMS.find((n) => n.href === acc);
    const label = nav?.label ?? decodeURIComponent(segs[i]);
    crumbs.push({ label, href: i === segs.length - 1 ? undefined : acc });
  }
  return crumbs;
}

export function AppTopbar({ user }: { user: Usuario }) {
  const pathname = usePathname();
  const crumbs = useMemo(() => buildCrumbs(pathname), [pathname]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { collapsed, toggle } = useSidebar();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 bg-[var(--color-bg)]/85 backdrop-blur border-b border-[var(--color-hairline)]">
        <div className="h-14 flex items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir navegación"
            className="lg:hidden flex h-9 w-9 items-center justify-center rounded-[6px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] transition-colors"
          >
            <NavIcon name="List" size={18} />
          </button>

          <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={collapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
                  aria-pressed={collapsed}
                  className="hidden lg:flex h-9 w-9 items-center justify-center rounded-[6px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] transition-colors"
                >
                  <NavIcon name="SidebarSimple" size={16} weight={collapsed ? 'fill' : 'regular'} />
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
            <ol className="flex items-center gap-1.5 text-[13px] text-[var(--color-muted)] overflow-hidden">
              <li className="hidden sm:flex items-center">
                <Link
                  href="/farmacias"
                  className="flex items-center gap-1 hover:text-[var(--color-ink-2)] transition-colors"
                  aria-label="Inicio"
                >
                  <NavIcon name="House" size={13} />
                </Link>
              </li>
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1.5 min-w-0">
                  <NavIcon
                    name="CaretRight"
                    size={11}
                    className="text-[var(--color-muted-2)] shrink-0"
                  />
                  {c.href ? (
                    <Link
                      href={c.href}
                      className="hover:text-[var(--color-ink-2)] transition-colors truncate max-w-[180px]"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-[var(--color-ink-2)] font-medium truncate max-w-[220px]">
                      {c.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* NOTE: Búsqueda global (⌘K) y notificaciones (Bell) están fuera
              del scope de Fase 1. El atajo ⌘K sigue registrado por si el
              usuario lo pulsa por reflejo (abre el modal WIP), pero los
              botones de la topbar se ocultan para no invitar a usarlos. */}

          <UserMenu user={user} />
        </div>
      </header>

      <MobileNavDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        userName={user.nombre}
        userRole={user.rol}
      />
      <CommandStub open={commandOpen} onClose={() => setCommandOpen(false)} />
    </>
  );
}
