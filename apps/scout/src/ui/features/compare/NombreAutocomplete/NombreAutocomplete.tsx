'use client';

import { useMemo, useRef, useState } from 'react';
import { useSearchHistory } from '../hooks/useSearchHistory';

/** Lista curada de productos populares — misma que se muestra en el empty state. */
const POPULAR_PRODUCTS: string[] = [
  'Fisiocrem Gel Forte 50 ml',
  'Bioderma Sensibio H2O 500 ml',
  'Isdin Fusion Water Magic 50 ml',
  'Frenadol Complex 10 sobres',
  'Nuxe Huile Prodigieuse 100 ml',
  'Aquilea Sueño 30 comprimidos',
  'La Roche-Posay Anthelios 50+',
  'Vichy Mineral 89',
  'Cerave Crema Hidratante',
  'Voltaren Emulgel',
];

interface Suggestion {
  value: string;
  source: 'history' | 'popular';
  /** Contexto para mostrar debajo (ej: "hace 3 días · 12 farm · desde 12.10€"). */
  hint?: string;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export interface NombreAutocompleteProps {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

/**
 * Input controlado con dropdown de sugerencias combinando historial + populares.
 * - Al enfocar sin texto: muestra 3 más recientes + 3 populares.
 * - Al escribir: filtra ambas fuentes por matching normalizado (sin acentos, case-insensitive).
 * - Enter/click → rellena el input.
 * - Escape → cierra el dropdown.
 * - Blur → cierra tras 150ms (permite click en el dropdown).
 */
export function NombreAutocomplete({
  id,
  name,
  defaultValue,
  placeholder,
  className,
}: NombreAutocompleteProps) {
  const [value, setValue] = useState(defaultValue ?? '');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const history = useSearchHistory();

  // Nota: si el padre necesita cambiar `defaultValue` desde afuera (ej: click en
  // otra sugerencia), debe pasar `key={defaultValue}` para forzar el remount de
  // este componente. Así evitamos setState-in-effect y mantenemos el patrón claro.

  const suggestions: Suggestion[] = useMemo(() => {
    const q = normalize(value.trim());
    const historyNames = history
      .filter((h) => h.nombre)
      .map<Suggestion>((h) => ({
        value: h.nombre!,
        source: 'history',
        hint:
          h.resultsCount > 0 && h.bestPrice
            ? `${h.resultsCount} farmacia${h.resultsCount === 1 ? '' : 's'} · desde ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: h.moneda ?? 'EUR', minimumFractionDigits: 2 }).format(h.bestPrice)}`
            : undefined,
      }));

    const popularSugs = POPULAR_PRODUCTS.map<Suggestion>((p) => ({
      value: p,
      source: 'popular',
    }));

    // Dedup: si ya está en el historial, no lo mostramos como "popular"
    const historyValues = new Set(historyNames.map((s) => normalize(s.value)));
    const uniquePopular = popularSugs.filter((s) => !historyValues.has(normalize(s.value)));

    const all = [...historyNames, ...uniquePopular];
    if (!q) {
      // Sin query: primeros 3 del historial + primeros 5 populares
      return [...historyNames.slice(0, 3), ...uniquePopular.slice(0, 5)];
    }
    // Con query: filtramos por matching
    return all.filter((s) => normalize(s.value).includes(q)).slice(0, 8);
  }, [value, history]);

  function handleSelect(sug: Suggestion) {
    setValue(sug.value);
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (open && activeIdx >= 0 && suggestions[activeIdx]) {
        e.preventDefault();
        handleSelect(suggestions[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  function handleBlur() {
    // Delay para permitir click sobre el dropdown
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), 150);
  }

  function handleFocus() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpen(true);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActiveIdx(-1);
        }}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        aria-controls={`${id}-listbox`}
        className={className}
      />

      {open && suggestions.length > 0 && (
        <ul
          id={`${id}-listbox`}
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        >
          {suggestions.map((sug, idx) => {
            const active = idx === activeIdx;
            return (
              <li key={`${sug.source}-${sug.value}`} role="option" aria-selected={active}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // Evita el blur del input antes del click
                    e.preventDefault();
                    handleSelect(sug);
                  }}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                    active
                      ? 'bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100'
                      : 'text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-900'
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded ${
                      sug.source === 'history'
                        ? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
                        : 'bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400'
                    }`}
                    aria-hidden="true"
                  >
                    {sug.source === 'history' ? (
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                        <path d="M12 2 15 8h6l-5 4 2 8-6-4-6 4 2-8-5-4h6z" />
                      </svg>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{sug.value}</div>
                    {sug.hint && (
                      <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-500">
                        {sug.hint}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
                    {sug.source === 'history' ? 'Reciente' : 'Popular'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
