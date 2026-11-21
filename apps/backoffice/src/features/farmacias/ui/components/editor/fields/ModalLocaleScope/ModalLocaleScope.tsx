'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { LOCALES, LOCALE_FLAGS, LOCALE_LABELS, type Locale, type MultilangText } from '@/core/shared';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { cn } from '@/shared/lib/cn';
import { BotonIdioma } from '@/features/farmacias/ui/components/editor/fields/BotonIdioma';

const ScopedLocaleContext = createContext<Locale | null>(null);

/** Idioma en el que escriben los campos multilang: el del modal si hay uno, si no el del editor. */
export function useEditingLocale(): Locale {
  const scoped = useContext(ScopedLocaleContext);
  const { currentLocale } = useFarmaciaEditor();
  return scoped ?? currentLocale;
}

const filled = (v: MultilangText | undefined, l: Locale) => !!v?.[l]?.trim();

/**
 * Pestañas de idioma propias de un modal: se rellenan todos los idiomas sin
 * cerrarlo. Empieza en el idioma activo del editor y no lo cambia.
 */
export function ModalLocaleScope({
  values,
  children,
}: {
  /** Campos multilang del borrador, para marcar los idiomas que faltan. */
  values: (MultilangText | undefined)[];
  children: ReactNode | ((locale: Locale) => ReactNode);
}) {
  const { farmacia, currentLocale, readOnly } = useFarmaciaEditor();
  const activos = LOCALES.filter((l) => farmacia.idiomasActivos.includes(l));
  const [locale, setLocale] = useState<Locale>(activos.includes(currentLocale) ? currentLocale : (activos[0] ?? 'es'));

  const algunoRelleno = values.some((v) => activos.some((l) => filled(v, l)));

  return (
    <ScopedLocaleContext.Provider value={locale}>
      {activos.length > 1 && (
        <div role="group" aria-label="Idioma en el que escribes" className="flex gap-1 p-1 rounded-[10px] bg-[var(--color-surface-sunken)]">
          {activos.map((l) => {
            const active = l === locale;
            const completo = values.every((v) => !activos.some((o) => filled(v, o)) || filled(v, l));
            const falta = algunoRelleno && !completo;
            return (
              <BotonIdioma
                key={l}
                pulsado={active}
                onPulsar={() => setLocale(l)}
                enFieldsetDesactivado={readOnly}
                className={cn(
                  'relative flex-1 flex items-center justify-center gap-1.5 h-11 sm:h-8 rounded-[7px] text-[13px] transition-colors',
                  active
                    ? 'bg-[var(--color-surface)] text-[var(--color-ink)] font-medium shadow-[0_1px_2px_rgba(26,15,10,0.08)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink-2)]',
                )}
              >
                <span aria-hidden className="text-[15px] leading-none">{LOCALE_FLAGS[l]}</span>
                {LOCALE_LABELS[l]}
                {falta && (
                  <>
                    <span aria-hidden title="Falta por traducir" className="h-1.5 w-1.5 rounded-full bg-[var(--color-red-ink)]" />
                    <span className="sr-only">, falta por traducir</span>
                  </>
                )}
              </BotonIdioma>
            );
          })}
        </div>
      )}
      {typeof children === 'function' ? children(locale) : children}
    </ScopedLocaleContext.Provider>
  );
}
