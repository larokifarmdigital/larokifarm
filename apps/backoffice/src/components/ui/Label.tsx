'use client';

import { forwardRef, type LabelHTMLAttributes, type ReactNode } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

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
          <span
            className="ml-0.5 text-[var(--color-accent)] font-medium"
            aria-label="obligatorio"
            title="Campo obligatorio"
          >
            *
          </span>
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
