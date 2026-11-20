'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

const TABS = [
  { href: '/albaranes', label: 'Nueva conciliación', icon: 'Receipt' },
  { href: '/albaranes/historial', label: 'Historial', icon: 'ClockCounterClockwise' },
] as const;

/** Pestañas del módulo Conciliador: subir archivos · historial (incluye el detalle). */
export function ConciliadorTabs() {
  const pathname = usePathname();
  const isHistorial = pathname.startsWith('/albaranes/historial');

  return (
    <nav aria-label="Conciliador" className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
      <ul className="flex gap-1 border-b border-[var(--color-hairline)]">
        {TABS.map((t) => {
          const active = t.href === '/albaranes/historial' ? isHistorial : !isHistorial;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  '-mb-px flex min-h-11 items-center gap-2 border-b-2 px-3 sm:px-4 py-2.5 text-[13.5px] whitespace-nowrap transition-colors',
                  active
                    ? 'border-[var(--color-accent)] text-[var(--color-ink)] font-medium'
                    : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink-2)]',
                )}
              >
                <NavIcon name={t.icon} size={15} />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
