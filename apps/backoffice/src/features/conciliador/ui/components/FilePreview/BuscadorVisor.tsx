'use client';

import { useId } from 'react';

/**
 * Pasa a minúsculas y quita acentos carácter a carácter, conservando la
 * longitud del texto: así las posiciones encontradas sirven para resaltar en
 * el texto original.
 */
export function normalizarBusqueda(s: string): string {
  let out = '';
  for (const c of s) {
    const base = c.normalize('NFD')[0] ?? c;
    out += base.length === c.length ? base.toLowerCase() : c.toLowerCase();
  }
  return out;
}

/** Posiciones de inicio de cada aparición de `q` (ya normalizada) en `texto`. */
export function buscarEn(texto: string, q: string): number[] {
  if (!q) return [];
  const t = normalizarBusqueda(texto);
  const pos: number[] = [];
  let i = t.indexOf(q);
  while (i !== -1) {
    pos.push(i);
    i = t.indexOf(q, i + q.length);
  }
  return pos;
}

interface BuscadorVisorProps {
  valor: string;
  onCambio: (v: string) => void;
  total: number;
  actual: number;
  onIr: (delta: 1 | -1) => void;
  etiqueta: string;
  className?: string;
}

/** Caja de búsqueda de los visores: Enter = siguiente, Mayús+Enter = anterior. */
export function BuscadorVisor({ valor, onCambio, total, actual, onIr, etiqueta, className = '' }: BuscadorVisorProps) {
  const id = useId();
  const hayTexto = valor.trim() !== '';
  return (
    <div role="search" className={`flex min-w-0 items-center gap-1 ${className}`}>
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      <div className="relative min-w-0 flex-1 sm:flex-none">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          id={id}
          type="search"
          value={valor}
          placeholder="Buscar…"
          autoComplete="off"
          onChange={(e) => onCambio(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && total > 0) {
              e.preventDefault();
              onIr(e.shiftKey ? -1 : 1);
            }
          }}
          className="h-11 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2 text-sm text-slate-800 sm:h-8 sm:w-56 sm:text-xs"
        />
      </div>
      <span aria-live="polite" className="min-w-[4.5rem] text-center text-xs tabular-nums text-slate-600">
        {hayTexto ? (total > 0 ? `${actual + 1} de ${total}` : 'Sin resultados') : ''}
      </span>
      <BotonFlecha titulo="Resultado anterior" disabled={total === 0} onClick={() => onIr(-1)} d="m18 15-6-6-6 6" />
      <BotonFlecha titulo="Resultado siguiente" disabled={total === 0} onClick={() => onIr(1)} d="m6 9 6 6 6-6" />
    </div>
  );
}

function BotonFlecha({ titulo, disabled, onClick, d }: { titulo: string; disabled: boolean; onClick: () => void; d: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={titulo}
      aria-label={titulo}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 sm:h-8 sm:w-8"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={d} />
      </svg>
    </button>
  );
}
