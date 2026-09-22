'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Island Button · patrón Humblytics.
 * Pill oscuro con icono circular. Al hover:
 *  - fondo migra al accent naranja
 *  - icono se desplaza (translateX + translateY)
 *  - icono cambia colores (swap)
 * Motion sin JS: puramente CSS transitions con spring easing.
 */

type Variant = 'dark' | 'light';

export type IslandButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: Variant;
};

export const IslandButton = forwardRef<HTMLButtonElement, IslandButtonProps>(
  ({ className, children, icon, variant = 'dark', ...props }, ref) => {
    const isDark = variant === 'dark';
    return (
      <button
        ref={ref}
        className={cn(
          'group inline-flex items-center gap-2 pl-4 pr-1.5 h-9 rounded-full text-[13px] font-medium tracking-[-0.01em]',
          'transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]',
          'active:scale-[0.97] disabled:opacity-55 disabled:pointer-events-none',
          isDark
            ? 'bg-[var(--color-ink)] text-[var(--color-bg)] hover:bg-[var(--color-accent)]'
            : 'bg-[var(--color-surface)] text-[var(--color-ink-2)] border border-[var(--color-hairline-strong)] hover:bg-[var(--color-accent)] hover:text-white hover:border-[var(--color-accent)]',
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        <span
          className={cn(
            'inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px]',
            'transition-[transform,background-color,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
            'group-hover:translate-x-[2px] group-hover:-translate-y-[1px]',
            isDark
              ? 'bg-[var(--color-bg)] text-[var(--color-ink)] group-hover:bg-white group-hover:text-[var(--color-accent)]'
              : 'bg-[var(--color-surface-sunken)] text-[var(--color-ink-2)] group-hover:bg-white group-hover:text-[var(--color-accent)]',
          )}
          aria-hidden
        >
          {icon ?? '↗'}
        </span>
      </button>
    );
  },
);
IslandButton.displayName = 'IslandButton';
