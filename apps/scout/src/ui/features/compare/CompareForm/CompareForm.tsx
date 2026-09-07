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
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/60 border-t-white" />
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
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 ' +
  'transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ' +
  'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-teal-400 dark:focus:ring-teal-400/20';

const LABEL_CLASS =
  'mb-1.5 flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300';

export function CompareForm({ action, defaultCn, defaultEan, defaultNombre }: CompareFormProps) {
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="cn" className={LABEL_CLASS}>
            <span className="rounded bg-teal-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
              CN
            </span>
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
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="ean" className={LABEL_CLASS}>
            <span className="rounded bg-teal-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
              EAN
            </span>
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
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label htmlFor="nombre" className={LABEL_CLASS}>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
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

      <div className="flex flex-col-reverse items-stretch gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          Con <strong>1 solo campo</strong> alcanza. El nombre exacto suele dar mejores resultados.
        </p>
        <SubmitButton />
      </div>

      <details className="text-xs text-zinc-500 dark:text-zinc-500">
        <summary className="cursor-pointer select-none font-medium hover:text-zinc-700 dark:hover:text-zinc-300">
          ¿Cuál es mejor: CN, EAN o Nombre?
        </summary>
        <ul className="mt-3 space-y-1.5 pl-4 [&_li]:list-disc [&_li]:marker:text-teal-500">
          <li>
            <strong className="text-zinc-700 dark:text-zinc-300">Solo CN</strong>: para medicamentos regulados. Consultamos CIMA y resolvemos nombre + EAN automáticamente.
          </li>
          <li>
            <strong className="text-zinc-700 dark:text-zinc-300">Solo EAN</strong>: útil si tenés el código de barras. Muy preciso si Google indexa por EAN.
          </li>
          <li>
            <strong className="text-zinc-700 dark:text-zinc-300">Solo Nombre</strong>: la opción más flexible. Ideal para parafarmacia y cosmética.
          </li>
          <li>
            <strong className="text-zinc-700 dark:text-zinc-300">Combinar</strong>: podés poner los 3 juntos para máxima precisión.
          </li>
        </ul>
      </details>
    </form>
  );
}
