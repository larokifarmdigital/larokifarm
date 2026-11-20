'use client';

import { useState } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { LOCALES, LOCALE_FLAGS, LOCALE_LABELS, LOCALE_NOMBRE, type Locale } from '@/core/shared';
import { countBySection, type SectionKey } from '@/features/farmacias/ui/lib/i18nStatus';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

/**
 * Pestañas de idioma de una sección.
 * - Pulsar una pestaña SOLO cambia el idioma que editas: nunca escribe. Si el
 *   idioma no está activado en la web, sale un aviso con "Activar" (confirmado).
 * - El punto rojo indica que a ESTA sección le falta traducir algo en ese idioma.
 */
export function LangTabs({ sectionKey }: { sectionKey: string }) {
  const { farmacia, currentLocale, setLocale, activarIdioma, readOnly } = useFarmaciaEditor();
  const [confirmar, setConfirmar] = useState(false);
  const [activando, setActivando] = useState(false);

  const seccion = countBySection(farmacia).find((s) => s.key === (sectionKey as SectionKey));
  const faltan = (l: Locale) => seccion?.byLocale[l]?.missing ?? 0;
  const activo = farmacia.idiomasActivos.includes(currentLocale);

  return (
    <div className="mb-6">
      <div
        role="group"
        aria-label="Idioma que estás editando"
        className="flex items-center gap-1 overflow-x-auto border-b border-[var(--color-hairline)]"
      >
        {LOCALES.map((l) => {
          const active = currentLocale === l;
          const activated = farmacia.idiomasActivos.includes(l);
          const n = activated ? faltan(l) : 0;
          return (
            <button
              key={l}
              type="button"
              aria-pressed={active}
              onClick={() => setLocale(l)}
              className={cn(
                'relative flex min-h-11 shrink-0 items-center gap-2 px-3 sm:px-4 text-[14px] whitespace-nowrap transition-colors',
                '-mb-px border-b-2',
                active
                  ? 'border-[var(--color-accent)] text-[var(--color-ink)] font-medium'
                  : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink-2)]',
              )}
            >
              <span aria-hidden className="text-[16px] leading-none">{LOCALE_FLAGS[l]}</span>
              {LOCALE_LABELS[l]}
              {!activated && <span className="text-[12px] text-[var(--color-muted)]">(no activado)</span>}
              {n > 0 && (
                <>
                  <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-[var(--color-red-ink)]" />
                  <span className="sr-only">, faltan {n} {n === 1 ? 'texto' : 'textos'} por traducir</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {!activo && (
        <div
          role="status"
          className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 rounded-[10px] border border-[var(--color-yellow-ink)]/30 bg-[var(--color-yellow-soft)] px-4 py-3 text-[14px] text-[var(--color-yellow-ink)]"
        >
          <NavIcon name="Warning" size={17} className="shrink-0" />
          <p className="m-0 flex-1">
            El {LOCALE_NOMBRE[currentLocale]} no está activado: lo que escribas aquí no saldrá en tu web.
          </p>
          {!readOnly && (
            <Button type="button" variant="accent" size="sm" disabled={activando} onClick={() => setConfirmar(true)}>
              Activar {LOCALE_NOMBRE[currentLocale]}
            </Button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmar}
        onOpenChange={setConfirmar}
        title={`¿Activar el ${LOCALE_NOMBRE[currentLocale]} en tu web?`}
        description="Tu web tendrá una versión en este idioma. Lo que aún no esté traducido se mostrará en castellano. Los cambios saldrán en la web cuando pulses Publicar."
        confirmLabel={`Activar ${LOCALE_NOMBRE[currentLocale]}`}
        variant="accent"
        onConfirm={() => {
          setActivando(true);
          void activarIdioma(currentLocale).finally(() => setActivando(false));
        }}
      />
    </div>
  );
}
