'use client';

import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { LOCALE_LABELS, type Locale } from '@/types/content';
import { useFarmaciaEditor } from './EditorContext';
import { countBySection, countLocaleStatus } from './i18nStatus';
import { NavIcon } from '@/features/shell/NavIcon';
import { formatRelativeDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

const FLAG: Record<Locale, string> = { es: '🇪🇸', en: '🇬🇧', ca: '🇦🇩' };

type HealthLevel = 'saving' | 'dirty' | 'missing' | 'ok';

function getLevel(saveStatus: string, dirty: boolean, totalMissing: number): HealthLevel {
  if (saveStatus === 'saving') return 'saving';
  if (dirty) return 'dirty';
  if (totalMissing > 0) return 'missing';
  return 'ok';
}

const LEVEL_STYLE: Record<HealthLevel, { ring: string; dot: string; label: string }> = {
  saving: {
    ring: 'ring-[var(--color-hairline-strong)]',
    dot: 'bg-[var(--color-accent)]',
    label: 'Guardando…',
  },
  dirty: {
    ring: 'ring-[var(--color-yellow-soft)]',
    dot: 'bg-[var(--color-yellow-ink)]',
    label: 'Sin guardar',
  },
  missing: {
    ring: 'ring-[var(--color-red-soft)]',
    dot: 'bg-[var(--color-red-ink)]',
    label: 'Incompleto',
  },
  ok: {
    ring: 'ring-[var(--color-green-soft)]',
    dot: 'bg-[var(--color-green-ink)]',
    label: 'Al día',
  },
};

function ProgressBar({
  filled,
  total,
  tone,
}: {
  filled: number;
  total: number;
  tone: 'green' | 'yellow' | 'red';
}) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const bg =
    tone === 'green'
      ? 'bg-[var(--color-green-ink)]'
      : tone === 'yellow'
        ? 'bg-[var(--color-yellow-ink)]'
        : 'bg-[var(--color-red-ink)]';
  return (
    <div
      className="relative h-1.5 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden"
      aria-label={`${pct}%`}
    >
      <div
        className={cn('absolute inset-y-0 left-0 rounded-full', bg)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EditorHealthChip({ align = 'start' }: { align?: 'start' | 'center' | 'end' }) {
  const { farmacia, currentLocale, setLocale, saveStatus, dirty, lastSavedAt } = useFarmaciaEditor();
  const [open, setOpen] = useState(false);

  const active = farmacia.idiomasActivos;

  const perLocale = useMemo(
    () =>
      active.map((l) => {
        const { total, filled, missing } = countLocaleStatus(farmacia, l);
        return { locale: l, total, filled, missing };
      }),
    [farmacia, active],
  );

  const totalMissing = perLocale.reduce((a, l) => a + l.missing, 0);
  const level = getLevel(saveStatus, dirty, totalMissing);
  const style = LEVEL_STYLE[level];

  const bySection = useMemo(() => countBySection(farmacia), [farmacia]);
  const sectionsWithMissing = useMemo(
    () =>
      bySection
        .map((sec) => {
          const missingByLocale = active
            .map((l) => ({ locale: l, missing: sec.byLocale[l]?.missing ?? 0 }))
            .filter((x) => x.missing > 0);
          return { ...sec, missingByLocale };
        })
        .filter((sec) => sec.missingByLocale.length > 0),
    [bySection, active],
  );

  const jumpToLocale = (l: Locale) => {
    if (l !== currentLocale) setLocale(l);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Estado: ${style.label}${totalMissing > 0 ? ` — ${totalMissing} por traducir` : ''}`}
          title={style.label}
          className={cn(
            'relative inline-flex items-center justify-center h-6 w-6 rounded-full bg-[var(--color-surface)] border border-[var(--color-hairline)] hover:border-[var(--color-hairline-strong)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
          )}
        >
          {level === 'saving' ? (
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full border-[2px] border-[var(--color-hairline-strong)] border-t-[var(--color-accent)] animate-spin"
            />
          ) : (
            <span
              aria-hidden
              className={cn('inline-block h-2 w-2 rounded-full ring-2 ring-inset', style.dot, style.ring)}
            />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align={align}
          sideOffset={8}
          className="z-40 w-[300px] max-w-[calc(100vw-24px)] rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-elevated)] p-3.5 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          {/* Estado guardado */}
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-hairline)]">
            <span className={cn('inline-block h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden />
            <span className="text-[12.5px] text-[var(--color-ink)] font-medium">{style.label}</span>
            <span className="ml-auto text-[11px] text-[var(--color-muted)] font-mono-tabular">
              {saveStatus === 'saving'
                ? '…'
                : dirty
                  ? 'pendiente'
                  : lastSavedAt
                    ? formatRelativeDate(lastSavedAt)
                    : ''}
            </span>
          </div>

          {/* Idiomas */}
          <div className="pt-3">
            <p className="font-mono-tabular text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted-2)] m-0 mb-2">
              Idiomas
            </p>
            <ul className="space-y-2 m-0 p-0 list-none">
              {perLocale.map((l) => {
                const complete = l.total > 0 && l.filled === l.total;
                const tone = l.missing > 0 ? 'red' : complete ? 'green' : 'yellow';
                return (
                  <li key={l.locale}>
                    <button
                      type="button"
                      onClick={() => jumpToLocale(l.locale)}
                      className="w-full text-left flex items-center gap-2 group"
                    >
                      <span aria-hidden className="text-[13px] leading-none w-4 text-center shrink-0">
                        {FLAG[l.locale]}
                      </span>
                      <span className="text-[12px] text-[var(--color-ink-2)] w-[74px] shrink-0 group-hover:text-[var(--color-ink)]">
                        {LOCALE_LABELS[l.locale]}
                      </span>
                      <span className="flex-1 min-w-0">
                        <ProgressBar filled={l.filled} total={l.total} tone={tone} />
                      </span>
                      <span
                        className={cn(
                          'text-[10.5px] font-mono-tabular tabular-nums shrink-0 tabular-nums',
                          l.missing > 0
                            ? 'text-[var(--color-red-ink)]'
                            : complete
                              ? 'text-[var(--color-green-ink)]'
                              : 'text-[var(--color-muted)]',
                        )}
                      >
                        {l.filled}/{l.total}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Por sección */}
          {sectionsWithMissing.length > 0 && (
            <div className="pt-3 mt-3 border-t border-[var(--color-hairline)]">
              <p className="font-mono-tabular text-[10px] uppercase tracking-[0.08em] text-[var(--color-muted-2)] m-0 mb-2">
                Por sección
              </p>
              <ul className="space-y-1.5 m-0 p-0 list-none">
                {sectionsWithMissing.map((sec) => (
                  <li key={sec.key} className="flex items-center gap-2">
                    <span className="text-[12px] text-[var(--color-ink-2)] flex-1">{sec.label}</span>
                    <span className="flex items-center gap-1">
                      {sec.missingByLocale.map((m) => (
                        <button
                          key={m.locale}
                          type="button"
                          onClick={() => jumpToLocale(m.locale)}
                          className="inline-flex items-center gap-1 h-5 px-1.5 rounded bg-[var(--color-red-soft)] text-[var(--color-red-ink)] text-[10.5px] font-mono-tabular hover:brightness-95"
                          title={`Faltan ${m.missing} en ${LOCALE_LABELS[m.locale]}`}
                        >
                          <span aria-hidden>{FLAG[m.locale]}</span>
                          {m.missing}
                        </button>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sectionsWithMissing.length === 0 && level === 'ok' && (
            <div className="pt-3 mt-3 border-t border-[var(--color-hairline)]">
              <p className="text-[12px] text-[var(--color-muted)] m-0 flex items-center gap-1.5">
                <NavIcon name="Check" size={12} className="text-[var(--color-green-ink)]" />
                Todos los campos multi-idioma completos.
              </p>
            </div>
          )}

          <Popover.Arrow className="fill-[var(--color-surface)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
