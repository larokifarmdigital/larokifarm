import { NavIcon, type IconName } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import type { FarmaciaStatus } from '@/core/farmacias/domain';

type StatConfig = {
  key: 'total' | FarmaciaStatus;
  label: string;
  icon: IconName;
  tone: 'accent' | 'green' | 'yellow' | 'neutral';
};

const STATS: StatConfig[] = [
  { key: 'total', label: 'Total', icon: 'Storefront', tone: 'accent' },
  { key: 'published', label: 'Publicadas', icon: 'Check', tone: 'green' },
  { key: 'draft', label: 'Borradores', icon: 'PencilSimple', tone: 'yellow' },
  { key: 'archived', label: 'Archivadas', icon: 'Archive', tone: 'neutral' },
];

const TONE_STYLES: Record<StatConfig['tone'], { bg: string; fg: string }> = {
  accent: {
    bg: 'bg-[var(--color-accent-soft)]',
    fg: 'text-[var(--color-accent-ink)]',
  },
  green: {
    bg: 'bg-[var(--color-green-soft)]',
    fg: 'text-[var(--color-green-ink)]',
  },
  yellow: {
    bg: 'bg-[var(--color-yellow-soft)]',
    fg: 'text-[var(--color-yellow-ink)]',
  },
  neutral: {
    bg: 'bg-[var(--color-surface-sunken)]',
    fg: 'text-[var(--color-muted)]',
  },
};

export type FarmaciaCounts = Record<'total' | FarmaciaStatus, number>;

/** Tarjetas de resumen por estado (total / publicadas / borradores / archivadas). */
export function FarmaciaStats({ counts }: { counts: FarmaciaCounts }) {
  return (
    <section
      aria-label="Resumen por estado"
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
    >
      {STATS.map((stat) => {
        const value = counts[stat.key];
        const tone = TONE_STYLES[stat.tone];
        const pct =
          stat.key === 'total' || counts.total === 0
            ? null
            : Math.round((value / counts.total) * 100);
        return (
          <div
            key={stat.key}
            className="card p-4 sm:p-5 flex items-start justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <p className="eyebrow m-0 mb-2 text-[10.5px]">{stat.label}</p>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-[26px] sm:text-[30px] leading-none tracking-[-0.03em] font-medium text-[var(--color-ink)] font-mono-tabular tabular-nums"
                  data-tabular
                >
                  {value}
                </span>
                {pct !== null && (
                  <span className="text-[11.5px] font-mono-tabular text-[var(--color-muted)]">
                    {pct}%
                  </span>
                )}
              </div>
            </div>
            <div
              aria-hidden
              className={cn(
                'shrink-0 h-9 w-9 rounded-[8px] flex items-center justify-center',
                tone.bg,
                tone.fg,
              )}
            >
              <NavIcon name={stat.icon} size={16} weight="fill" />
            </div>
          </div>
        );
      })}
    </section>
  );
}
