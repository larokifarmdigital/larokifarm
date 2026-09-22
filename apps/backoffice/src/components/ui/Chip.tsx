import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const chipTones = {
  neutral: 'chip chip-neutral',
  green: 'chip chip-green',
  yellow: 'chip chip-yellow',
  red: 'chip chip-red',
  blue: 'chip chip-blue',
} as const;

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: keyof typeof chipTones;
};

export function Chip({ className, tone = 'neutral', ...props }: ChipProps) {
  return <span className={cn(chipTones[tone], className)} {...props} />;
}
