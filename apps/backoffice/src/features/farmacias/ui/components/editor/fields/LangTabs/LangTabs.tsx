'use client';

import { useEffect } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { LOCALES, LOCALE_LABELS, LOCALE_PRINCIPAL, type Locale } from '@/core/shared';
import { countBySection, type SectionKey } from '@/features/farmacias/ui/lib/i18nStatus';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import { BotonIdioma } from '@/features/farmacias/ui/components/editor/fields/BotonIdioma';

/**
 * Pestañas de idioma de una sección: solo los idiomas ACTIVOS de la web.
 * Pulsar una pestaña solo cambia el idioma que editas; nunca escribe.
 * Añadir, desactivar o borrar idiomas se hace en "Idiomas de la web".
 * El punto rojo indica que a ESTA sección le falta traducir algo en ese idioma.
 */
export function LangTabs({ sectionKey }: { sectionKey: string }) {
  const { farmacia, currentLocale, setLocale, goToSection, readOnly } = useFarmaciaEditor();
  const activos = LOCALES.filter((l) => l === LOCALE_PRINCIPAL || farmacia.idiomasActivos.includes(l));

  // Si el idioma que se editaba deja de estar activo, se vuelve al castellano
  useEffect(() => {
    if (!activos.includes(currentLocale)) setLocale(LOCALE_PRINCIPAL);
  }, [activos, currentLocale, setLocale]);

  const seccion = countBySection(farmacia).find((s) => s.key === (sectionKey as SectionKey));
  const faltan = (l: Locale) => seccion?.byLocale[l]?.missing ?? 0;

  if (activos.length <= 1) {
    return (
      <p className="mb-6 -mt-2 text-[13.5px] text-[var(--color-ink-2)]">
        Tu web está solo en castellano.{' '}
        <button
          type="button"
          onClick={() => goToSection('idiomas', undefined, true)}
          className="inline-flex min-h-11 sm:min-h-0 items-center font-medium text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-accent-hover)]"
        >
          {readOnly ? 'Ver idiomas' : 'Añadir otro idioma'}
        </button>
      </p>
    );
  }

  return (
    <div className="mb-6 flex items-end gap-2 border-b border-[var(--color-hairline)]">
      <div
        role="group"
        aria-label="Idioma que estás editando"
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
      >
        {activos.map((l) => {
          const active = currentLocale === l;
          const n = faltan(l);
          return (
            <BotonIdioma
              key={l}
              pulsado={active}
              onPulsar={() => setLocale(l)}
              enFieldsetDesactivado={readOnly}
              className={cn(
                'relative flex min-h-11 shrink-0 items-center gap-2 px-3 sm:px-4 text-[14px] whitespace-nowrap transition-colors',
                '-mb-px border-b-2',
                active
                  ? 'border-[var(--color-accent)] text-[var(--color-ink)] font-medium'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink-2)]',
              )}
            >
              {LOCALE_LABELS[l]}
              {n > 0 && (
                <>
                  <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-[var(--color-red-ink)]" />
                  <span className="sr-only">, faltan {n} {n === 1 ? 'texto' : 'textos'} por traducir</span>
                </>
              )}
            </BotonIdioma>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => goToSection('idiomas', undefined, true)}
        className="mb-1 inline-flex min-h-11 sm:min-h-8 shrink-0 items-center gap-1.5 rounded-[8px] px-2 text-[13.5px] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
      >
        <NavIcon name="Translate" size={15} />
        <span className="hidden sm:inline">{readOnly ? 'Ver idiomas' : 'Gestionar idiomas'}</span>
        <span className="sm:hidden">Idiomas</span>
      </button>
    </div>
  );
}
