'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Si true, muestra un input para filtrar (útil con muchas opciones). */
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Selecciona…',
  searchable = false,
  disabled = false,
  className = '',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery('');
    }
  }, [open, searchable]);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-left text-sm focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50"
        style={{
          ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span
          className={`truncate ${selected ? 'text-slate-900' : 'text-slate-400'}`}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {searchable && (
            <div className="border-b border-slate-100 p-2">
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2"
                style={{
                  ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
                }}
              />
            </div>
          )}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400">
                Sin resultados.
              </li>
            ) : (
              filtered.map((o) => {
                const active = o.value === value;
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                      role="option"
                      aria-selected={active}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm ${
                        active ? 'font-medium' : ''
                      } hover:bg-slate-50`}
                      style={
                        active
                          ? {
                              background: 'var(--brand-primary-soft)',
                              color: 'var(--brand-accent)',
                            }
                          : { color: '#334155' /* slate-700 */ }
                      }
                    >
                      <span className="truncate">{o.label}</span>
                      {active && <CheckIcon />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      style={{ color: 'var(--brand-primary)' }}
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
