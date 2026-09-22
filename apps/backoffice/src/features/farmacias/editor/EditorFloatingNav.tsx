'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { NavIcon, type IconName } from '@/features/shell/NavIcon';
import { cn } from '@/lib/utils';

export type FloatingNavSection = {
  key: string;
  label: string;
  icon: IconName;
};

const ACTIVE_LAYOUT_ID = 'editor-nav-active-pill';

export function EditorFloatingNav({
  sections,
  activeKey,
  onSelect,
}: {
  sections: FloatingNavSection[];
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'center',
      behavior: 'smooth',
    });
  }, [activeKey]);

  return (
    <div
      aria-hidden={false}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] sm:bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
      style={{ maxWidth: 'min(100vw - 16px, 720px)' }}
    >
      <nav
        aria-label="Secciones del editor"
        className="pointer-events-auto flex items-center gap-0.5 p-1 rounded-full bg-[var(--color-ink)]/95 backdrop-blur border border-[var(--color-ink)]/30 shadow-[0_10px_40px_-8px_rgba(26,15,10,0.35),0_2px_6px_-2px_rgba(26,15,10,0.2)] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((s) => {
          const active = s.key === activeKey;
          return (
            <Tooltip.Root key={s.key} delayDuration={200}>
              <Tooltip.Trigger asChild>
                <button
                  ref={active ? activeButtonRef : undefined}
                  type="button"
                  onClick={() => onSelect(s.key)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'relative shrink-0 inline-flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-full text-[13px] font-medium tracking-[-0.005em] transition-colors',
                    active
                      ? 'text-white'
                      : 'text-[var(--color-bg)]/85 hover:bg-white/8 hover:text-white',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={ACTIVE_LAYOUT_ID}
                      className="absolute inset-0 rounded-full bg-[var(--color-accent)]"
                      transition={
                        reduced
                          ? { duration: 0 }
                          : {
                              type: 'spring',
                              stiffness: 480,
                              damping: 38,
                              mass: 0.6,
                            }
                      }
                      aria-hidden
                    />
                  )}
                  <span className="relative z-[1] inline-flex items-center gap-1.5">
                    <NavIcon name={s.icon} size={14} weight={active ? 'fill' : 'regular'} />
                    <span className="hidden sm:inline">{s.label}</span>
                  </span>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="top"
                  sideOffset={8}
                  className="sm:hidden bg-[var(--color-ink)] text-white text-[11.5px] px-2 py-1 rounded-[4px]"
                >
                  {s.label}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </nav>
    </div>
  );
}
