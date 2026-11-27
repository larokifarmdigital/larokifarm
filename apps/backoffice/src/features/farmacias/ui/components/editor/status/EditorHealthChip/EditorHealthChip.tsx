'use client';

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { LOCALE_CODIGO, LOCALE_LABELS, type Locale } from '@/core/shared';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { useI18nHealth } from '@/features/farmacias/ui/hooks/useI18nHealth';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

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

/** Estado de las traducciones (solo si la web tiene más de un idioma). */
export function EditorHealthChip({ align = 'start' }: { align?: 'start' | 'center' | 'end' }) {
  const { farmacia, currentLocale, setLocale, goToSection } = useFarmaciaEditor();
  const [open, setOpen] = useState(false);

  const { perLocale, totalMissing, sectionsWithMissing } = useI18nHealth();
  if (farmacia.idiomasActivos.length < 2) return null;
  const texto = totalMissing > 0
    ? `Faltan ${totalMissing} ${totalMissing === 1 ? 'traducción' : 'traducciones'}`
    : 'Traducciones al día';

  const jumpToLocale = (l: Locale) => {
    if (l !== currentLocale) setLocale(l);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 min-h-11 sm:min-h-7 rounded-full px-1 sm:px-2 text-[13px] font-medium hover:bg-[var(--color-surface-sunken)] transition-colors',
            totalMissing > 0 ? 'text-[var(--color-red-ink)]' : 'text-[var(--color-muted)]',
          )}
        >
          <NavIcon name="Translate" size={15} />
          {texto}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label="Estado de las traducciones"
          side="bottom"
          align={align}
          sideOffset={8}
          className="z-40 w-[300px] max-w-[calc(100vw-24px)] rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-elevated)] p-3.5 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <div>
            <p className="text-[12.5px] font-semibold text-[var(--color-muted)] m-0 mb-2">
              Textos traducidos por idioma
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
                      className="w-full min-h-11 sm:min-h-9 text-left flex items-center gap-2 group"
                    >
                      <span aria-hidden className="text-[11px] font-semibold leading-none w-6 text-center shrink-0 text-[var(--color-muted)]">
                        {LOCALE_CODIGO[l.locale]}
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

          {sectionsWithMissing.length > 0 && (
            <div className="pt-3 mt-3 border-t border-[var(--color-hairline)]">
              <p className="text-[12.5px] font-semibold text-[var(--color-muted)] m-0 mb-2">
                Qué falta traducir
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
                          onClick={() => {
                            goToSection(sec.key, m.locale);
                            setOpen(false);
                          }}
                          className="inline-flex items-center gap-1 min-h-11 sm:min-h-8 px-2.5 sm:px-2 rounded bg-[var(--color-red-soft)] text-[var(--color-red-ink)] text-[12px] hover:brightness-95"
                          aria-label={`${sec.label}: faltan ${m.missing} en ${LOCALE_LABELS[m.locale]}`}
                        >
                          <span aria-hidden className="font-semibold">{LOCALE_CODIGO[m.locale]}</span>
                          {m.missing}
                        </button>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sectionsWithMissing.length === 0 && (
            <div className="pt-3 mt-3 border-t border-[var(--color-hairline)]">
              <p className="text-[12px] text-[var(--color-muted)] m-0 flex items-center gap-1.5">
                <NavIcon name="Check" size={12} className="text-[var(--color-green-ink)]" />
                Todos los textos están traducidos.
              </p>
            </div>
          )}

          <Popover.Arrow className="fill-[var(--color-surface)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
