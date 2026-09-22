import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function SectionHeader({
  title,
  hint,
  actions,
  className,
  id,
}: {
  title: string;
  hint?: ReactNode;
  actions?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-6 mb-4', className)}>
      <div className="min-w-0 max-w-[62ch]">
        <h3
          id={id}
          className="text-[15px] font-semibold leading-[1.3] tracking-[-0.015em] text-[var(--color-ink)] m-0"
        >
          {title}
        </h3>
        {hint && (
          <p className="text-[12.5px] leading-[1.5] text-[var(--color-muted)] mt-1 m-0">
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
