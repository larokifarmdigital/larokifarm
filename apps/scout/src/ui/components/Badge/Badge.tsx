import type { ReactNode } from 'react';
import { cn } from '@/ui/lib/cn';

type Tone = 'neutral' | 'success' | 'danger' | 'info' | 'warning' | 'accent';

export type BadgeProps = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

const tones: Record<Tone, string> = {
  neutral:
    'bg-[color:var(--surface)] text-[color:var(--foreground)] border border-[color:var(--border)]',
  success:
    'bg-[color:var(--pastel-green-bg)] text-[color:var(--pastel-green-fg)]',
  danger:
    'bg-[color:var(--pastel-red-bg)] text-[color:var(--pastel-red-fg)]',
  info:
    'bg-[color:var(--pastel-blue-bg)] text-[color:var(--pastel-blue-fg)]',
  warning:
    'bg-[color:var(--pastel-amber-bg)] text-[color:var(--pastel-amber-fg)]',
  accent:
    'bg-[color:var(--pastel-teal-bg)] text-[color:var(--pastel-teal-fg)]',
};

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-xs)] px-1.5 py-0.5 text-[11px] font-medium tracking-wide',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
