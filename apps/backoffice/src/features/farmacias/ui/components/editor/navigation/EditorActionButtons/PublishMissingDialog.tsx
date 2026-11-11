'use client';

import type { Locale } from '@/core/shared';
import type { MissingSummary } from '@/features/farmacias/ui/lib/i18nStatus';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Modal } from '@/shared/components/molecules/Modal';

/**
 * Aviso previo a publicar cuando hay traducciones pendientes. Confirma, no
 * bloquea: "missing" es heurístico (un texto solo en castellano puede ser
 * intencionado) y la landing cae al idioma por defecto vía `localizar()`.
 */
export function PublishMissingDialog({
  open,
  onOpenChange,
  summary,
  publishing,
  onPublish,
  onReview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: MissingSummary;
  publishing: boolean;
  onPublish: () => void;
  /** Ir a una sección; sin argumentos, a la primera con pendientes. */
  onReview: (sectionKey?: string) => void;
}) {
  const n = summary.totalMissing;
  const missingLocales = summary.perLocale.filter((l) => l.missing > 0).map((l) => l.locale);

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !publishing && onOpenChange(o)}
      title={n === 1 ? 'Falta 1 traducción' : `Faltan ${n} traducciones`}
      description={describeFallback(missingLocales)}
      maxWidth="sm"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            size="md"
            onClick={() => onReview()}
            disabled={publishing}
            className="w-full justify-center sm:w-auto"
          >
            Revisar ahora
          </Button>
          <Button
            variant="accent"
            size="md"
            onClick={onPublish}
            disabled={publishing}
            className="w-full justify-center sm:w-auto"
          >
            <NavIcon name="Check" size={13} />
            {publishing ? 'Publicando…' : 'Publicar igualmente'}
          </Button>
        </div>
      }
    >
      <ul className="m-0 p-0 list-none divide-y divide-[var(--color-hairline)]">
        {summary.sectionsWithMissing.map((sec) => (
          <li key={sec.key}>
            <button
              type="button"
              onClick={() => onReview(sec.key)}
              disabled={publishing}
              className="group flex w-full items-center gap-2 py-2.5 text-left rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <span className="flex-1 text-[13.5px] font-medium text-[var(--color-ink)]">
                {sec.label}
              </span>
              <span className="flex items-center gap-1">
                {sec.missingByLocale.map((m) => (
                  <span
                    key={m.locale}
                    title={`${m.missing} sin traducir al ${LOCALE_NAMES_ES[m.locale]}`}
                    className="inline-flex items-center gap-1 h-5 px-1.5 rounded bg-[var(--color-red-soft)] text-[var(--color-red-ink)] text-[10.5px] font-mono-tabular uppercase"
                  >
                    {m.locale} {m.missing}
                  </span>
                ))}
              </span>
              <NavIcon
                name="CaretRight"
                size={12}
                className="text-[var(--color-muted-2)] group-hover:text-[var(--color-ink)] transition-colors"
              />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

// Nombres en castellano para el copy (LOCALE_LABELS los da en su propio idioma).
const LOCALE_NAMES_ES: Record<Locale, string> = { es: 'castellano', en: 'inglés', ca: 'catalán' };

function joinLabels(locales: Locale[]): string {
  const names = locales.map((l) => LOCALE_NAMES_ES[l]);
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`;
}

// La landing resuelve: idioma pedido → castellano → primer idioma con texto.
function describeFallback(missingLocales: Locale[]): string {
  const target = missingLocales.includes('es') ? 'en el idioma que sí tenga el texto' : 'en castellano';
  return `Hay textos sin traducir al ${joinLabels(missingLocales)}. Hasta que lo estén, la web los mostrará ${target}.`;
}
