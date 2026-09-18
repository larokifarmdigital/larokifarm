'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/ui/components/Button';
import { NombreAutocomplete } from '../NombreAutocomplete';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        <>
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70" />
          Comparando…
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          Comparar precios
        </>
      )}
    </Button>
  );
}

export type CompareFormProps = {
  action: (formData: FormData) => void;
  defaultCn?: string;
  defaultEan?: string;
  defaultNombre?: string;
};

const INPUT_CLASS =
  'w-full rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-white/[0.02] px-3 py-2.5 text-sm text-[color:var(--foreground-strong)] placeholder:text-[color:var(--muted)] backdrop-blur ' +
  'transition-colors duration-[var(--dur-fast)] focus:border-[color:var(--accent)] focus:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-glow)]';

const LABEL_CLASS =
  'mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-[color:var(--muted)]';

const CODE_BADGE =
  'font-mono-tabular rounded-[var(--radius-xs)] border border-[color:var(--border)] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold tracking-normal text-[color:var(--foreground-strong)]';

export function CompareForm({ action, defaultCn, defaultEan, defaultNombre }: CompareFormProps) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cn" className={LABEL_CLASS}>
            <span className={CODE_BADGE}>CN</span>
            Código Nacional
          </label>
          <input
            id="cn"
            name="cn"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={defaultCn}
            placeholder="6-7 dígitos, ej: 173408"
            className={`${INPUT_CLASS} font-mono-tabular`}
          />
        </div>
        <div>
          <label htmlFor="ean" className={LABEL_CLASS}>
            <span className={CODE_BADGE}>EAN</span>
            Código de barras
          </label>
          <input
            id="ean"
            name="ean"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={defaultEan}
            placeholder="13 dígitos"
            className={`${INPUT_CLASS} font-mono-tabular`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="nombre" className={LABEL_CLASS}>
          <span className={CODE_BADGE}>NOM</span>
          Nombre del producto
        </label>
        <NombreAutocomplete
          key={defaultNombre ?? ''}
          id="nombre"
          name="nombre"
          defaultValue={defaultNombre}
          placeholder="Ej: Fisiocrem Gel Forte 50 ml"
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-[color:var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[color:var(--muted)]">
          Con <span className="text-[color:var(--foreground-strong)]">un solo campo</span> alcanza. El nombre exacto suele dar mejores resultados.
        </p>
        <SubmitButton />
      </div>

      <details className="text-xs text-[color:var(--muted)]">
        <summary className="cursor-pointer select-none font-medium transition-colors duration-[var(--dur-fast)] hover:text-[color:var(--foreground-strong)]">
          ¿Cuál es mejor: CN, EAN o Nombre?
        </summary>
        <ul className="mt-3 space-y-1.5 pl-4 [&_li]:list-disc [&_li]:marker:text-[color:var(--accent)]">
          <li>
            <span className="text-[color:var(--foreground-strong)]">Solo CN</span>: para medicamentos regulados. Consultamos CIMA y resolvemos nombre + EAN automáticamente.
          </li>
          <li>
            <span className="text-[color:var(--foreground-strong)]">Solo EAN</span>: útil si tienes el código de barras. Muy preciso si Google indexa por EAN.
          </li>
          <li>
            <span className="text-[color:var(--foreground-strong)]">Solo Nombre</span>: la opción más flexible. Ideal para parafarmacia y cosmética.
          </li>
          <li>
            <span className="text-[color:var(--foreground-strong)]">Combinar</span>: puedes poner los 3 juntos para máxima precisión.
          </li>
        </ul>
      </details>
    </form>
  );
}
