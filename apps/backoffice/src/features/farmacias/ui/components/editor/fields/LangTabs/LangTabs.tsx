'use client';

import { useRef, useState } from 'react';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { LOCALES, LOCALE_FLAGS, LOCALE_LABELS, LOCALE_NOMBRE, type Locale } from '@/core/shared';
import { countBySection, type SectionKey } from '@/features/farmacias/ui/lib/i18nStatus';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import { BotonIdioma } from '@/features/farmacias/ui/components/editor/fields/BotonIdioma';

/**
 * Pestañas de idioma de una sección.
 * - Pulsar una pestaña SOLO cambia el idioma que editas: nunca escribe. Si el
 *   idioma no está activado en la web, sale un aviso con "Activar" (confirmado).
 * - El punto rojo indica que a ESTA sección le falta traducir algo en ese idioma.
 */
export function LangTabs({ sectionKey }: { sectionKey: string }) {
  const { farmacia, currentLocale, setLocale, activarIdioma, desactivarIdioma, readOnly, esAdmin } = useFarmaciaEditor();
  const [confirmar, setConfirmar] = useState(false);
  const [confirmarDesactivar, setConfirmarDesactivar] = useState(false);
  const [activando, setActivando] = useState(false);
  const grupoRef = useRef<HTMLDivElement>(null);
  // Tras activar/desactivar, el botón que abrió el diálogo desaparece: el foco va a la pestaña del idioma.
  const enfocarPestana = () =>
    requestAnimationFrame(() => grupoRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus());
  const principal = currentLocale === LOCALES[0];
  const puedeDesactivar = esAdmin && !readOnly && !principal;

  const seccion = countBySection(farmacia).find((s) => s.key === (sectionKey as SectionKey));
  const faltan = (l: Locale) => seccion?.byLocale[l]?.missing ?? 0;
  const activo = farmacia.idiomasActivos.includes(currentLocale);

  return (
    <div className="mb-6">
      <div
        ref={grupoRef}
        role="group"
        aria-label="Idioma que estás editando"
        className="flex items-center gap-1 overflow-x-auto border-b border-[var(--color-hairline)]"
      >
        {LOCALES.map((l) => {
          const active = currentLocale === l;
          const activated = farmacia.idiomasActivos.includes(l);
          const n = activated ? faltan(l) : 0;
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
              <span aria-hidden className="text-[16px] leading-none">{LOCALE_FLAGS[l]}</span>
              {LOCALE_LABELS[l]}
              {!activated && <span className="text-[12px] text-[var(--color-muted)]">(no activado)</span>}
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

      {activo && puedeDesactivar && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={activando}
            onClick={() => setConfirmarDesactivar(true)}
            className="min-h-11 sm:min-h-8 px-2 rounded-[8px] text-[13.5px] text-[var(--color-muted)] underline underline-offset-2 hover:text-[var(--color-red-ink)] disabled:opacity-50"
          >
            Desactivar el {LOCALE_NOMBRE[currentLocale]} en la web
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmarDesactivar}
        onOpenChange={setConfirmarDesactivar}
        title={`¿Desactivar el ${LOCALE_NOMBRE[currentLocale]}?`}
        description={`Los textos en ${LOCALE_NOMBRE[currentLocale]} se conservan; la web dejará de mostrarlo cuando publiques. Puedes volver a activarlo cuando quieras.`}
        confirmLabel={`Desactivar ${LOCALE_NOMBRE[currentLocale]}`}
        variant="danger"
        onConfirm={() => {
          setActivando(true);
          void desactivarIdioma(currentLocale).finally(() => {
            setActivando(false);
            enfocarPestana();
          });
        }}
      />

      <ConfirmDialog
        open={confirmar}
        onOpenChange={setConfirmar}
        title={`¿Activar el ${LOCALE_NOMBRE[currentLocale]} en tu web?`}
        description="Tu web tendrá una versión en este idioma. Lo que aún no esté traducido se mostrará en castellano. Los cambios saldrán en la web cuando pulses Publicar."
        confirmLabel={`Activar ${LOCALE_NOMBRE[currentLocale]}`}
        variant="accent"
        onConfirm={() => {
          setActivando(true);
          void activarIdioma(currentLocale).finally(() => {
            setActivando(false);
            enfocarPestana();
          });
        }}
      />
    </div>
  );
}
