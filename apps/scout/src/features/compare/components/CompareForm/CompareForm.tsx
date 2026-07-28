'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/shared/components/atoms/Button';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Comparando…' : 'Comparar'}
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
  'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';

export function CompareForm({ action, defaultCn, defaultEan, defaultNombre }: CompareFormProps) {
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="cn" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Código Nacional (CN)
          </label>
          <input
            id="cn"
            name="cn"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={defaultCn}
            placeholder="6-7 dígitos"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="ean" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            EAN / Código de barras
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
        <label htmlFor="nombre" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Nombre del producto
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          autoComplete="off"
          defaultValue={defaultNombre}
          placeholder="Ej: Isdin Fusion Water Magic 50ml"
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Rellená al menos <strong>uno</strong>. Podés combinar los tres para máxima precisión.
        </p>
      </div>

      <details className="text-xs text-zinc-500 dark:text-zinc-400">
        <summary className="cursor-pointer select-none font-medium">¿Qué debo poner?</summary>
        <ul className="mt-2 list-inside list-disc space-y-1 pl-1">
          <li>
            <strong>Solo CN</strong>: el nombre y EAN se resuelven vía CIMA (medicamentos regulados).
          </li>
          <li>
            <strong>Solo EAN</strong>: útil si tenés el código de barras. Ojo: muchas farmacias no indexan por EAN — mejor sumar el nombre.
          </li>
          <li>
            <strong>Solo Nombre</strong>: perfecto para parafarmacia/cosmética que no está en CIMA.
          </li>
          <li>
            <strong>CN + Nombre</strong>: el nombre que ingreses gana sobre el que devuelva CIMA (útil si es un formato/presentación específico).
          </li>
          <li>
            <strong>CN + EAN</strong>: el EAN que ingreses gana sobre el de CIMA.
          </li>
        </ul>
      </details>
    </form>
  );
}
