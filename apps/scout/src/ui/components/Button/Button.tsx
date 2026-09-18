import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/ui/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const base =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--dur-fast)] ' +
  'ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] active:duration-[var(--dur-press)] ' +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
  'focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-[color:var(--background)]';

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

const styles: Record<Variant, string> = {
  primary:
    'bg-[color:var(--accent)] text-[color:var(--accent-fg)] ring-1 ring-[color:var(--accent-border)] ' +
    'shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_10px_28px_-10px_var(--accent-glow)] ' +
    'hover:bg-[color:var(--accent-hover)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_14px_32px_-8px_var(--accent-glow)]',
  secondary:
    'bg-white/[0.03] text-[color:var(--foreground-strong)] border border-[color:var(--border)] backdrop-blur ' +
    'hover:bg-white/[0.06] hover:border-[color:var(--border-strong)]',
  ghost:
    'text-[color:var(--muted)] hover:bg-white/[0.04] hover:text-[color:var(--foreground-strong)]',
  danger:
    'bg-[color:var(--danger)]/90 text-white ring-1 ring-white/10 shadow-[0_10px_28px_-10px_rgba(239,68,68,0.35)] hover:bg-[color:var(--danger)]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...rest },
  ref,
) {
  return <button ref={ref} className={cn(base, sizes[size], styles[variant], className)} {...rest} />;
});
