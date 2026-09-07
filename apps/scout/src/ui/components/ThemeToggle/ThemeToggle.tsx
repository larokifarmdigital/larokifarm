'use client';

import type { ReactElement } from 'react';
import { setTheme, useTheme, type Theme } from '@/ui/features/compare/hooks/useTheme';

/**
 * Toggle de 3 estados: light / system / dark. Se muestra como grupo de botones
 * pequeños en el header, con el activo resaltado.
 */
const OPTIONS: Array<{ value: Theme; label: string; icon: ReactElement }> = [
  {
    value: 'light',
    label: 'Tema claro',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v1M12 20v1M4.22 4.22l.7.7M18.36 18.36l.7.7M3 12h1M20 12h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'Tema del sistema',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="14" rx="2" />
        <path d="M8 20h8M12 18v2" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Tema oscuro',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
];

export function ThemeToggle() {
  const { theme } = useTheme();
  return (
    <div
      role="group"
      aria-label="Selección de tema"
      className="inline-flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            aria-label={opt.label}
            aria-pressed={active}
            title={opt.label}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
              active
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            {opt.icon}
          </button>
        );
      })}
    </div>
  );
}
