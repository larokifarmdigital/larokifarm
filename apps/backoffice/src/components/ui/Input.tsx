'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          'field',
          invalid && 'border-[var(--color-red-ink)] focus:border-[var(--color-red-ink)] focus:shadow-[0_0_0_3px_rgba(159,47,45,0.2)]',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';
