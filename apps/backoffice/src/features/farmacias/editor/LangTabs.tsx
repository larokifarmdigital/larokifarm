'use client';

import { useFarmaciaEditor } from './EditorContext';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/types/content';
import { countLocaleStatus } from './i18nStatus';
import { cn } from '@/lib/utils';

const FLAG: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇬🇧',
  ca: '🇦🇩',
};

export function LangTabs() {
  const { farmacia, currentLocale, setLocale, patch } = useFarmaciaEditor();

  return (
    <div
      role="tablist"
      aria-label="Idioma del contenido"
      className="mb-6 flex items-center gap-1 border-b border-[var(--color-hairline)] pb-0 -mx-0.5"
    >
      {LOCALES.map((l) => {
        const active = currentLocale === l;
        const activated = farmacia.idiomasActivos.includes(l);
        const { filled, total, missing } = countLocaleStatus(farmacia, l);
        const complete = total > 0 && filled === total;
        const empty = total > 0 && filled === 0 && missing === 0;
        const partialOk = total > 0 && filled > 0 && missing === 0 && filled < total;

        return (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              setLocale(l);
              if (!activated) {
                patch({ idiomasActivos: [...farmacia.idiomasActivos, l] });
              }
            }}
            className={cn(
              'group relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 text-[13px] sm:text-[13.5px] transition-colors whitespace-nowrap',
              '-mb-px border-b-2',
              active
                ? 'border-[var(--color-accent)] text-[var(--color-ink)]'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink-2)]',
            )}
          >
            <span aria-hidden className="text-[15px] sm:text-[17px] leading-none">{FLAG[l]}</span>
            <span className={cn(active ? 'font-medium' : '', 'hidden sm:inline')}>{LOCALE_LABELS[l]}</span>
            <span
              className={cn(active ? 'font-medium' : '', 'sm:hidden font-mono-tabular text-[12px]')}
              aria-hidden
            >
              {l.toUpperCase()}
            </span>
            {!activated ? (
              <span
                className="text-[10px] uppercase tracking-wider text-[var(--color-muted-2)]"
                aria-label="Sin activar"
                title="Sin activar — se activará al escribir"
              >
                nuevo
              </span>
            ) : total > 0 ? (
              <span className="relative inline-flex items-center">
                <span
                  className={cn(
                    'text-[10.5px] font-mono-tabular tabular-nums px-1.5 py-0.5 rounded',
                    complete
                      ? 'bg-[var(--color-green-soft)] text-[var(--color-green-ink)]'
                      : empty
                        ? 'bg-[var(--color-surface-sunken)] text-[var(--color-muted)]'
                        : partialOk
                          ? 'bg-[var(--color-surface-sunken)] text-[var(--color-ink-2)]'
                          : 'bg-[var(--color-surface-sunken)] text-[var(--color-ink-2)]',
                  )}
                  title={
                    missing > 0
                      ? `${filled} de ${total} · ${missing} rellenos en otros idiomas están vacíos en ${LOCALE_LABELS[l]}.`
                      : `${filled} de ${total} campos rellenos en ${LOCALE_LABELS[l]}`
                  }
                >
                  {filled}/{total}
                </span>
                {missing > 0 && (
                  <span
                    aria-label={`${missing} campos por traducir`}
                    className="absolute -top-1 -right-1 inline-block h-2 w-2 rounded-full bg-[var(--color-red-ink)] ring-2 ring-[var(--color-bg)]"
                  />
                )}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
