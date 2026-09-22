'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const button = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap select-none',
    'font-medium leading-none rounded-[6px]',
    'transition-[background-color,color,border-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-[var(--color-ink)] text-[var(--color-surface)] hover:bg-[var(--color-ink-2)]',
        secondary:
          'bg-[var(--color-surface)] text-[var(--color-ink-2)] border border-[var(--color-hairline-strong)] hover:bg-[var(--color-surface-sunken)]',
        ghost: 'text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]',
        accent:
          'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]',
        danger:
          'bg-[var(--color-red-soft)] text-[var(--color-red-ink)] hover:bg-[color-mix(in_srgb,var(--color-red-soft)_92%,var(--color-red-ink))]',
        link: 'text-[var(--color-accent)] underline underline-offset-[3px] decoration-transparent hover:decoration-[var(--color-accent)] p-0 h-auto',
      },
      size: {
        sm: 'text-[13px] h-8 px-3',
        md: 'text-[14px] h-9 px-4',
        lg: 'text-[15px] h-11 px-6',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & { asChild?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(button({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = 'Button';
