import { LOCALES, LOCALE_FLAGS, LOCALE_LABELS, type Locale } from '@/core/shared';
import { cn } from '@/shared/lib/cn';
import { IndicadorEleccion } from '@/shared/components/atoms/IndicadorEleccion';

/** Castellano es fijo: es el idioma de respaldo de la landing (`localizar()`). */
const PRIMARY_LOCALE: Locale = 'es';

/**
 * Tarjetas-checkbox de idiomas. Los checkboxes llevan `name="idiomas"`; el
 * castellano viaja como input hidden (un checkbox disabled no se envía).
 */
export function LanguagePicker({
  value,
  onToggle,
  error,
}: {
  value: Locale[];
  onToggle: (l: Locale) => void;
  error?: string;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="label mb-1">Idiomas de la web</legend>
      <input type="hidden" name="idiomas" value={PRIMARY_LOCALE} />

      {/* Mismo patrón que las tarjetas de rol (Nuevo usuario): control a la
          izquierda, una tarjeta por fila. */}
      <div className="flex flex-col gap-2">
        {LOCALES.map((l) => {
          const primary = l === PRIMARY_LOCALE;
          const checked = primary || value.includes(l);
          return (
            <label
              key={l}
              className={cn(
                'flex items-start gap-3 rounded-[10px] border px-3.5 py-3 min-h-11',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--color-accent)] has-[:focus-visible]:outline-offset-2',
                checked
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                  : 'border-[var(--color-control-border)] bg-[var(--color-surface)]',
                primary ? 'cursor-default' : 'cursor-pointer',
              )}
            >
              <input
                type="checkbox"
                id={`idiomas-${l}`}
                // El castellano viaja en el hidden de arriba (un checkbox disabled no se envía)
                name={primary ? undefined : 'idiomas'}
                value={l}
                checked={checked}
                disabled={primary}
                onChange={() => onToggle(l)}
                className="sr-only cursor-pointer"
              />
              <IndicadorEleccion tipo="checkbox" marcado={checked} desactivado={primary} />
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-[14.5px] font-semibold text-[var(--color-ink)]">
                  <span aria-hidden className="text-[16px] leading-none">{LOCALE_FLAGS[l]}</span>
                  {LOCALE_LABELS[l]}
                </span>
                <span className="block text-[13.5px] leading-[1.45] text-[var(--color-ink-2)]">
                  {primary ? 'Idioma principal: siempre activo' : 'Opcional'}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="help help-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
