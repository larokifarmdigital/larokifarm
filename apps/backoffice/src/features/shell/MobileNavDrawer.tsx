'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { useEffect } from 'react';
import {
  SECTION_LABELS,
  visibleNavItems,
  type NavRole,
  type NavSection,
} from './nav-config';
import { NavIcon, type IconName } from './NavIcon';
import { cn } from '@/lib/utils';

const SECTIONS: NavSection[] = ['principal', 'operaciones', 'sistema'];

export function MobileNavDrawer({
  open,
  onClose,
  userName,
  userRole,
}: {
  open: boolean;
  onClose: () => void;
  userName: string;
  userRole: NavRole | null;
}) {
  const navItems = visibleNavItems(userRole);
  const pathname = usePathname();

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-[var(--color-ink)]/40 backdrop-blur-sm z-40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed left-0 top-0 bottom-0 z-50 w-[280px] bg-[var(--color-surface-2)] border-r border-[var(--color-hairline)] flex flex-col data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left duration-200">
          <Dialog.Title className="sr-only">Navegación</Dialog.Title>
          <div className="px-5 py-5 border-b border-[var(--color-hairline)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-[var(--color-accent)] text-white text-[12px] font-semibold tracking-[-0.02em]"
              >
                l
              </span>
              <span className="text-[15px] font-medium tracking-[-0.015em] text-[var(--color-ink)]">
                larokifarm
              </span>
            </div>
            <Dialog.Close
              aria-label="Cerrar navegación"
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]"
            >
              <NavIcon name="X" size={16} />
            </Dialog.Close>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
            {SECTIONS.map((section) => {
              const items = navItems.filter((i) => i.section === section);
              if (items.length === 0) return null;
              return (
                <div key={section}>
                  <div className="px-2 mb-1.5 eyebrow text-[10px]">
                    {SECTION_LABELS[section]}
                  </div>
                  <ul className="space-y-0.5">
                    {items.map((item) => {
                      const active =
                        pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              'flex items-center gap-2.5 px-2.5 py-2 rounded-[6px] text-[14px] transition-colors',
                              active
                                ? 'bg-[var(--color-surface)] text-[var(--color-ink)]'
                                : 'text-[var(--color-ink-2)] hover:bg-[var(--color-surface)]',
                            )}
                          >
                            <NavIcon
                              name={item.icon as IconName}
                              size={16}
                              weight={active ? 'fill' : 'regular'}
                            />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>

          <div className="border-t border-[var(--color-hairline)] px-4 py-3 text-[12px] text-[var(--color-muted)]">
            Sesión: {userName}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
