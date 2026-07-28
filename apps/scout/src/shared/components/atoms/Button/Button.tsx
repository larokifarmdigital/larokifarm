import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

type Variant = 'primary' | 'secondary';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const base =
  'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ' +
  'disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2';

const styles: Record<Variant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 focus-visible:ring-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200',
  secondary:
    'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', ...rest },
  ref,
) {
  return <button ref={ref} className={cn(base, styles[variant], className)} {...rest} />;
});
