import { LOCALES, LOCALE_FLAGS, LOCALE_LABELS, type Locale } from '@/core/shared';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {LOCALES.map((l) => {
          const primary = l === PRIMARY_LOCALE;
          const checked = primary || value.includes(l);
          return (
            <label
              key={l}
              className={cn(
                'relative flex items-center gap-3 rounded-[10px] border p-3.5 transition-colors',
                checked
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                  : 'border-[var(--color-hairline)] bg-[var(--color-surface)] hover:border-[var(--color-hairline-strong)]',
                primary ? 'cursor-default' : 'cursor-pointer',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-accent)]',
              )}
            >
              {!primary && (
                <input
                  type="checkbox"
                  name="idiomas"
                  value={l}
                  checked={checked}
                  onChange={() => onToggle(l)}
                  className="sr-only"
                />
              )}
              <span aria-hidden className="text-[20px] leading-none">
                {LOCALE_FLAGS[l]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-medium text-[var(--color-ink)]">
                  {LOCALE_LABELS[l]}
                </span>
                <span className="block text-[11.5px] text-[var(--color-muted)]">
                  {primary ? 'Principal · siempre activo' : l.toUpperCase()}
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  'h-5 w-5 shrink-0 rounded-[5px] border flex items-center justify-center',
                  checked
                    ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                    : 'border-[var(--color-hairline-strong)] bg-[var(--color-surface)]',
                  primary && 'opacity-60',
                )}
              >
                {checked && <NavIcon name="Check" size={11} weight="bold" />}
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
