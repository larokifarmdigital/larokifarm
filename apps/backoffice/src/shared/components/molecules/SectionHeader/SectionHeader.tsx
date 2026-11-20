import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export function SectionHeader({
  title,
  hint,
  actions,
  className,
  id,
  required,
}: {
  title: string;
  /** Asterisco rojo: la sección es obligatoria para publicar (p. ej. al menos 1 elemento). */
  required?: boolean;
  hint?: ReactNode;
  actions?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-6 mb-5', className)}>
      <div className="min-w-0 max-w-[62ch]">
        <h3
          id={id}
          className="text-[14px] font-bold leading-[1.3] tracking-[-0.012em] text-[var(--color-ink)] m-0"
        >
          {title}
          {required && (
            <>
              <span aria-hidden className="ml-1 text-[var(--color-red-ink)] text-[1.3em] font-bold leading-none" title="Obligatorio para publicar">
                *
              </span>
              <span className="sr-only">, obligatorio</span>
            </>
          )}
        </h3>
        {hint && (
          <p className="text-[12.5px] leading-[1.55] text-[var(--color-muted-2)] mt-1 m-0">
            {hint}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
