'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Tooltip from '@radix-ui/react-tooltip';
import { buildNav } from '@/features/shell/ui/lib/navConfig';
import type { ShellInfo } from '@/features/shell/ui/lib/shellInfo';
import { NavList } from '@/features/shell/ui/components/NavList';
import { useSidebar } from '@/features/shell/ui/components/SidebarProvider';
import { BrandMark } from '@/shared/components/atoms/BrandMark';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { supportMailto } from '@/shared/lib/support';
import { cn } from '@/shared/lib/cn';

export function AppSidebar({ shell }: { shell: ShellInfo }) {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const items = buildNav({ role: shell.rol, miFarmaciaId: shell.miFarmacia?.id, variasFarmacias: (shell.misFarmacias?.length ?? 0) > 1 });
  const ayuda = supportMailto('Ayuda con el backoffice');

  return (
    <Tooltip.Provider delayDuration={200}>
      <aside
        aria-label="Navegación principal"
        data-collapsed={collapsed ? 'true' : 'false'}
        className={cn(
          'hidden lg:flex flex-col shrink-0 border-r border-[var(--color-hairline)] bg-[var(--color-surface-2)] h-[100dvh] sticky top-0',
          'transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]',
          collapsed ? 'w-[64px]' : 'w-[248px]',
        )}
      >
        <div className={cn('h-14 flex items-center border-b border-[var(--color-hairline)]', collapsed ? 'justify-center' : 'px-4')}>
          <Link
            href="/inicio"
            aria-label={collapsed ? 'Larokifarm, inicio' : undefined}
            className="flex items-center rounded-[8px]"
          >
            {collapsed ? (
              <span
                aria-hidden
                className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--color-accent)] text-white text-[14px] font-semibold"
              >
                L
              </span>
            ) : (
              <BrandMark />
            )}
          </Link>
        </div>

        <nav aria-label="Secciones" className={cn('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
          <NavList items={items} pathname={pathname} collapsed={collapsed} />
        </nav>

        {ayuda && (
          <div className={cn('border-t border-[var(--color-hairline)] py-3', collapsed ? 'px-2' : 'px-3')}>
            <a
              href={ayuda}
              aria-label={collapsed ? 'Ayuda y soporte' : undefined}
              className={cn(
                'flex items-center rounded-[8px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] transition-colors',
                collapsed ? 'h-10 w-10 justify-center mx-auto' : 'min-h-9 px-2.5 gap-2.5 text-[14px]',
              )}
            >
              <NavIcon name="Question" size={collapsed ? 18 : 16} className="text-[var(--color-muted)]" />
              {!collapsed && 'Ayuda y soporte'}
            </a>
          </div>
        )}
      </aside>
    </Tooltip.Provider>
  );
}
