import { LOCALES, LOCALE_PRINCIPAL, nombreIdioma, type Locale } from '@/core/shared';
import { OpcionEleccion } from '@/shared/components/atoms/OpcionEleccion';

/**
 * Idiomas de la web (catálogo cerrado) en filas de casilla. El castellano no
 * se muestra: va siempre, como input hidden (un checkbox disabled no se envía),
 * y es la raíz de la web y la reserva.
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
    <fieldset className="m-0 min-w-0 border-0 p-0" aria-describedby="idiomas-ayuda">
      <legend className="label mb-1">Idiomas de la web</legend>
      <input type="hidden" name="idiomas" value={LOCALE_PRINCIPAL} />
      <p id="idiomas-ayuda" className="m-0 mb-1 text-[13px] leading-[1.45] text-[var(--color-muted)]">
        El castellano va siempre. Podrás añadir o quitar idiomas más adelante.
      </p>
      <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
        {LOCALES.filter((l) => l !== LOCALE_PRINCIPAL).map((l) => (
          <OpcionEleccion
            key={l}
            tipo="checkbox"
            id={`idiomas-${l}`}
            name="idiomas"
            value={l}
            marcado={value.includes(l)}
            onChange={() => onToggle(l)}
            titulo={nombreIdioma(l)}
          />
        ))}
      </div>
      {error && (
        <p className="help help-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
