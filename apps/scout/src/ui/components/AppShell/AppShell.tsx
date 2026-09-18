'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/ui/lib/cn';

interface AppShellProps {
  children: ReactNode;
  /** Slot para acciones específicas de cada ruta. */
  actions?: ReactNode;
}

function ScoutLogo({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

const NAV = [
  {
    href: '/',
    label: 'Búsqueda',
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
  },
  {
    href: '/batch',
    label: 'Masiva',
    icon: (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18M9 4v16" />
      </svg>
    ),
  },
] as const;

export function AppShell({ children, actions }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Fluid Island navbar · floating pill detached del top. */}
      <header className="sticky top-4 z-30 flex justify-center px-4 sm:top-5">
        <div className="glass-strong flex items-center gap-3 rounded-full px-3 py-1.5 sm:px-4 sm:py-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[color:var(--foreground-strong)]"
            aria-label="Scout · Inicio"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-[color:var(--accent)] ring-1 ring-[color:var(--accent-border)]">
              <ScoutLogo className="h-3.5 w-3.5" />
            </span>
            <span className="hidden text-sm font-semibold tracking-tight sm:inline">Scout</span>
          </Link>

          <div className="h-4 w-px bg-[color:var(--border)]" aria-hidden="true" />

          <nav className="flex items-center gap-0.5" aria-label="Modos de comparación">
            {NAV.map((item) => {
              const active =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors duration-[var(--dur-fast)] sm:px-3',
                    active
                      ? 'bg-white/[0.06] text-[color:var(--foreground-strong)] ring-1 ring-[color:var(--border-strong)]'
                      : 'text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={active ? 'text-[color:var(--accent)]' : ''}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {actions && (
            <>
              <div className="h-4 w-px bg-[color:var(--border)]" aria-hidden="true" />
              <div className="flex items-center gap-1.5">{actions}</div>
            </>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-1">{children}</main>
    </div>
  );
}
