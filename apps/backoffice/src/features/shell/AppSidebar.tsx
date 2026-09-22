'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Tooltip from '@radix-ui/react-tooltip';
import { NAV_ITEMS, SECTION_LABELS, type NavSection } from './nav-config';
import { NavIcon, type IconName } from './NavIcon';
import { useSidebar } from './SidebarProvider';
import { cn } from '@/lib/utils';

const SECTIONS: NavSection[] = ['principal', 'operaciones', 'sistema'];

export function AppSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();

  return (
    <Tooltip.Provider delayDuration={200}>
      <aside
        aria-label="Navegación principal"
        data-collapsed={collapsed ? 'true' : 'false'}
        className={cn(
          'hidden lg:flex flex-col shrink-0 border-r border-[var(--color-hairline)] bg-[var(--color-surface-2)] h-[100dvh] sticky top-0',
          'transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
          collapsed ? 'w-[56px]' : 'w-[240px]',
        )}
      >
        <div className="px-3 py-4 border-b border-[var(--color-hairline)]">
          <Link
            href="/farmacias"
            aria-label="Ir al inicio del backoffice"
            className={cn(
              'flex items-center gap-2',
              collapsed && 'justify-center',
            )}
          >
            <span
              aria-hidden
              className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] bg-[var(--color-accent)] text-white text-[13px] font-semibold tracking-[-0.02em] shrink-0"
            >
              l
            </span>
            {!collapsed && (
              <span className="text-[15px] font-medium tracking-[-0.015em] text-[var(--color-ink)] truncate">
                larokifarm
              </span>
            )}
          </Link>
        </div>

        <nav className={cn('flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-3')}>
          <div className={cn('space-y-4', !collapsed && 'space-y-6')}>
            {SECTIONS.map((section) => {
              const items = NAV_ITEMS.filter((i) => i.section === section);
              if (items.length === 0) return null;
              return (
                <div key={section}>
                  {!collapsed && (
                    <div className="px-2 mb-1.5 eyebrow text-[10px]">
                      {SECTION_LABELS[section]}
                    </div>
                  )}
                  <ul className="space-y-0.5">
                    {items.map((item) => {
                      const active =
                        pathname === item.href || pathname.startsWith(`${item.href}/`);
                      const link = (
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          aria-label={collapsed ? item.label : undefined}
                          className={cn(
                            'group flex items-center rounded-[6px] transition-colors duration-100',
                            collapsed
                              ? 'h-9 w-9 justify-center mx-auto'
                              : 'px-2.5 py-1.5 gap-2.5 text-[13.5px]',
                            active
                              ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-[var(--shadow-hairline)]'
                              : 'text-[var(--color-ink-2)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]',
                          )}
                        >
                          <NavIcon
                            name={item.icon as IconName}
                            size={collapsed ? 17 : 16}
                            weight={active ? 'fill' : 'regular'}
                            className={active ? 'text-[var(--color-accent)]' : ''}
                          />
                          {!collapsed && (
                            <>
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.badge === 'wip' && (
                                <span className="text-[9.5px] uppercase tracking-wider font-semibold text-[var(--color-muted-2)] px-1.5 py-0.5 rounded bg-[var(--color-surface-sunken)]">
                                  En obra
                                </span>
                              )}
                              {item.badge === 'nuevo' && (
                                <span className="text-[9.5px] uppercase tracking-wider font-semibold text-[var(--color-accent-ink)] px-1.5 py-0.5 rounded bg-[var(--color-accent-soft)]">
                                  Nuevo
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      );

                      return (
                        <li key={item.href}>
                          {collapsed ? (
                            <Tooltip.Root>
                              <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
                              <Tooltip.Portal>
                                <Tooltip.Content
                                  side="right"
                                  sideOffset={8}
                                  className="bg-[var(--color-ink)] text-white text-[12px] px-2 py-1 rounded-[4px] shadow-[var(--shadow-elevated)]"
                                >
                                  {item.label}
                                  {item.badge === 'wip' && ' · en obra'}
                                  <Tooltip.Arrow className="fill-[var(--color-ink)]" />
                                </Tooltip.Content>
                              </Tooltip.Portal>
                            </Tooltip.Root>
                          ) : (
                            link
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>

        <div className={cn('border-t border-[var(--color-hairline)] py-2.5', collapsed ? 'px-2' : 'px-3')}>
          {collapsed ? (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <div className="flex items-center justify-center h-9 rounded-[6px] text-[var(--color-muted)]">
                  <NavIcon name="User" size={16} />
                </div>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="right"
                  sideOffset={8}
                  className="bg-[var(--color-ink)] text-white text-[12px] px-2 py-1 rounded-[4px]"
                >
                  {userName}
                  <Tooltip.Arrow className="fill-[var(--color-ink)]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          ) : (
            <>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[12px] text-[var(--color-muted)]">
                <NavIcon name="User" size={14} />
                <span className="truncate">{userName}</span>
              </div>
              <div className="mt-1 px-2 text-[10.5px] text-[var(--color-muted-2)] flex items-center gap-1.5">
                <kbd>⌘</kbd>
                <kbd>K</kbd>
                <span>para buscar</span>
              </div>
            </>
          )}
        </div>
      </aside>
    </Tooltip.Provider>
  );
}
