'use client';

import { motion, useReducedMotion } from 'motion/react';
import { NavIcon, type IconName } from '@/features/shell/NavIcon';
import { cn } from '@/lib/utils';

export type SegmentedItem = {
  key: string;
  label: string;
  icon: IconName;
};

const ACTIVE_LAYOUT_ID = 'editor-group-segmented-active';

export function EditorGroupSegmented({
  items,
  activeKey,
  onSelect,
}: {
  items: SegmentedItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <nav
      aria-label="Sub-secciones"
      className="flex items-stretch gap-0.5 p-1 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-hairline)] w-full sm:w-fit sm:max-w-full sm:overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((s) => {
        const active = s.key === activeKey;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect(s.key)}
            aria-current={active ? 'true' : undefined}
            className={cn(
              'relative inline-flex items-center justify-center gap-1.5 h-8 px-3 sm:px-3.5 rounded-full text-[12.5px] font-medium tracking-[-0.005em] transition-colors whitespace-nowrap',
              'flex-1 sm:flex-none sm:shrink-0',
              active
                ? 'text-[var(--color-ink)]'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink-2)]',
            )}
          >
            {active && (
              <motion.span
                layoutId={ACTIVE_LAYOUT_ID}
                className="absolute inset-0 rounded-full bg-[var(--color-surface)] shadow-[var(--shadow-hairline)]"
                transition={
                  reduced
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 480, damping: 38, mass: 0.6 }
                }
                aria-hidden
              />
            )}
            <span className="relative z-[1] inline-flex items-center gap-1.5">
              <NavIcon
                name={s.icon}
                size={12}
                weight={active ? 'fill' : 'regular'}
                className={active ? 'text-[var(--color-accent)]' : undefined}
              />
              {s.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
