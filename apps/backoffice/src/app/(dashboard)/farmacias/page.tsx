import Link from 'next/link';
import { contentRepository } from '@/lib/content-repository';
import { FarmaciasList } from '@/features/farmacias/FarmaciasList';
import { Button } from '@/components/ui/Button';
import { NavIcon, type IconName } from '@/features/shell/NavIcon';
import { cn, formatRelativeDate } from '@/lib/utils';
import type { FarmaciaStatus } from '@/types/content';

export const metadata = { title: 'Farmacias · larokifarm' };

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

export default async function FarmaciasPage() {
  const farmacias = await contentRepository.listFarmacias();

  const counts = {
    total: farmacias.length,
    published: farmacias.filter((f) => f.status === 'published').length,
    draft: farmacias.filter((f) => f.status === 'draft').length,
    archived: farmacias.filter((f) => f.status === 'archived').length,
  };

  // Última actualización global entre todas las farmacias — da contexto en el header
  // sin tener que entrar al listado.
  const lastUpdate = farmacias
    .map((f) => f.updatedAt)
    .filter(Boolean)
    .sort()
    .pop();

  return (
    <div className="max-w-[1200px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-16 sm:pb-24">
      <header className="flex flex-col gap-4 mb-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow mb-2">Contenido</p>
          <h1 className="h-display m-0">Farmacias</h1>
          <p className="mt-2 text-[14px] text-[var(--color-muted)] max-w-lg text-pretty">
            Cada farmacia es la fuente de una landing pública. Edita textos,
            servicios y horarios; publica cuando estés listo.
          </p>
          {lastUpdate && (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--color-muted-2)] font-mono-tabular">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-green-ink)]"
              />
              Última actualización {formatRelativeDate(lastUpdate)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="accent" size="md" asChild className="flex-1 sm:flex-none">
            <Link href="/farmacias/nueva">
              <NavIcon name="Plus" size={14} />
              Nueva farmacia
            </Link>
          </Button>
        </div>
      </header>

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

      <FarmaciasList farmacias={farmacias} />
    </div>
  );
}
