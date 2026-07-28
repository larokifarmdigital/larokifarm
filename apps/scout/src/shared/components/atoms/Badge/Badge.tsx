import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

type Tone = 'neutral' | 'success' | 'danger' | 'info' | 'warning';

export type BadgeProps = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

const tones: Record<Tone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  danger: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  info: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
};

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
