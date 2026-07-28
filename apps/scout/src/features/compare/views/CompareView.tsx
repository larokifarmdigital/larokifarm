'use client';

import { useActionState } from 'react';
import { compareAction, type CompareActionState } from '../api/compareAction';
import { CompareForm } from '../components/CompareForm';
import { ComparisonTable } from '../components/ComparisonTable';

const initialState: CompareActionState = { status: 'idle' };

export function CompareView() {
  const [state, formAction, isPending] = useActionState(compareAction, initialState);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Scout · comparador de precios
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Buscá por Código Nacional, EAN o Nombre. Identificamos el producto y comparamos
          precios en farmacias online españolas usando Google en tiempo real.
        </p>
      </header>

      <CompareForm action={formAction} />

      {isPending && (
        <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-700 dark:border-t-zinc-300" />
          Identificando producto y buscando precios… (puede tardar 15-45s)
        </div>
      )}

      {!isPending && state.status === 'error' && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
          {state.error}
        </div>
      )}

      {!isPending && state.status === 'done' && (
        <ComparisonTable report={state.result} />
      )}

      {!isPending && state.status === 'idle' && (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Ejemplo: pon{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
            173408
          </code>{' '}
          como CN, o{' '}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
            Isdin Fusion Water
          </code>{' '}
          en el campo nombre.
        </div>
      )}
    </div>
  );
}
