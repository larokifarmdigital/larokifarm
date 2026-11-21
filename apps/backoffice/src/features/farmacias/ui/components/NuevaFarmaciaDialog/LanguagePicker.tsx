import { LOCALES, LOCALE_LABELS, LOCALE_PRINCIPAL, nombreIdioma, type Locale } from '@/core/shared';
import { cn } from '@/shared/lib/cn';
import { IndicadorEleccion } from '@/shared/components/atoms/IndicadorEleccion';

/**
 * Tarjetas-checkbox de idiomas (catálogo cerrado). Los checkboxes llevan
 * `name="idiomas"`; el castellano viaja como input hidden (un checkbox
 * disabled no se envía). Es el principal: raíz de la web y reserva.
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
    <fieldset className="space-y-2" aria-describedby="idiomas-ayuda">
      <legend className="label mb-1">Idiomas de la web</legend>
      <input type="hidden" name="idiomas" value={LOCALE_PRINCIPAL} />
      <p id="idiomas-ayuda" className="m-0 text-[13.5px] leading-[1.45] text-[var(--color-ink-2)]">
        Podrás cambiarlos cuando quieras desde <strong className="font-semibold">Idiomas de la web</strong>.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {LOCALES.map((l) => {
          const primary = l === LOCALE_PRINCIPAL;
          const checked = primary || value.includes(l);
          return (
            <label
              key={l}
              className={cn(
                'flex items-center gap-3 rounded-[10px] border px-3.5 py-2.5 min-h-11',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--color-accent)] has-[:focus-visible]:outline-offset-2',
                primary && 'sm:col-span-2',
                checked
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                  : 'border-[var(--color-control-border)] bg-[var(--color-surface)]',
                primary ? 'cursor-default' : 'cursor-pointer',
              )}
            >
              <input
                type="checkbox"
                id={`idiomas-${l}`}
                name={primary ? undefined : 'idiomas'}
                value={l}
                checked={checked}
                disabled={primary}
                onChange={() => onToggle(l)}
                className="sr-only cursor-pointer"
              />
              <IndicadorEleccion tipo="checkbox" marcado={checked} desactivado={primary} />
              <span className="min-w-0">
                <span className="block text-[14.5px] font-semibold text-[var(--color-ink)]">{nombreIdioma(l)}</span>
                <span className="block text-[13px] leading-[1.4] text-[var(--color-ink-2)]">
                  {primary ? 'Idioma principal: siempre activo' : LOCALE_LABELS[l]}
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
