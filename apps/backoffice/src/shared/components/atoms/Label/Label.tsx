'use client';

import { forwardRef, type LabelHTMLAttributes, type ReactNode } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/shared/lib/cn';

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement> & {
  required?: boolean;
  hint?: ReactNode;
};

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, hint, children, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn('label flex items-center gap-2', className)}
      {...props}
    >
      <span>
        {children}
        {required && (
          <>
            {/* El * es visual; el lector oye ", obligatorio" (antes leía "Correo electrónicoobligatorio") */}
            <span
              aria-hidden
              className="ml-1 text-[var(--color-red-ink)] text-[1.3em] font-bold leading-none align-[-0.05em]"
              title="Campo obligatorio"
            >
              *
            </span>
            <span className="sr-only">, obligatorio</span>
          </>
        )}
      </span>
      {hint && (
        <span className="label-hint text-[11px] font-normal text-[var(--color-muted)] flex items-center gap-1">
          {hint}
        </span>
      )}
    </LabelPrimitive.Root>
  ),
);
Label.displayName = 'Label';
