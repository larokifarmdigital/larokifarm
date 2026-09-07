import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all ' +
  'disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

const styles: Record<Variant, string> = {
  primary:
    'bg-teal-600 text-white shadow-sm hover:bg-teal-700 focus-visible:ring-teal-500 focus-visible:ring-offset-white ' +
    'dark:bg-teal-500 dark:text-white dark:hover:bg-teal-400 dark:focus-visible:ring-offset-zinc-950',
  secondary:
    'border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50 focus-visible:ring-zinc-400 ' +
    'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800',
  ghost:
    'text-zinc-700 hover:bg-zinc-100 focus-visible:ring-zinc-300 dark:text-zinc-300 dark:hover:bg-zinc-800',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...rest },
  ref,
) {
  return <button ref={ref} className={cn(base, sizes[size], styles[variant], className)} {...rest} />;
});
