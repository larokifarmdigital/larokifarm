import { cn } from '@/shared/lib/cn';

/**
 * Marca del backoffice. ÚNICO sitio donde cambiar el logo cuando llegue el
 * definitivo (login, sidebar, drawer móvil).
 */
export function BrandMark({ size = 'md', className }: { size?: 'md' | 'lg'; className?: string }) {
  const grande = size === 'lg';
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden
        className={cn(
          'inline-flex items-center justify-center rounded-[8px] bg-[var(--color-accent)] text-white font-semibold tracking-[-0.02em]',
          grande ? 'h-10 w-10 text-[18px]' : 'h-8 w-8 text-[14px]',
        )}
      >
        L
      </span>
      <span
        className={cn(
          'font-semibold tracking-[-0.02em] text-[var(--color-ink)]',
          grande ? 'text-[19px]' : 'text-[15px]',
        )}
      >
        Larokifarm
      </span>
    </span>
  );
}
