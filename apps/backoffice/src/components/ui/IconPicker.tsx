'use client';

import { useMemo, useState } from 'react';
import { NavIcon } from '@/features/shell/NavIcon';
import { IconoSVG } from './IconoSVG';
import {
  ICONOS_CATALOGO,
  CATEGORIAS_LABEL,
  type IconoCategoria,
  type IconoNombre,
} from '@/lib/iconos-catalogo';
import { cn } from '@/lib/utils';

const CATEGORIAS: IconoCategoria[] = ['salud', 'productos', 'servicios', 'personas'];

export function IconPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (nombre: IconoNombre | undefined) => void;
}) {
  const [query, setQuery] = useState('');

  const filtrado = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICONOS_CATALOGO;
    return ICONOS_CATALOGO.filter(
      (i) => i.value.includes(q) || i.label.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <NavIcon
          name="MagnifyingGlass"
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted-2)] pointer-events-none"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre… (ej: gota, sol, corazón)"
          aria-label="Buscar icono"
          className="field pl-9"
        />
      </div>

      {value && (
        <div className="flex items-center gap-3 px-3 py-2 bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/25 rounded-[var(--radius-sm)]">
          <IconoSVG
            nombre={value}
            size={20}
            style={{ color: 'var(--color-accent)' }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium text-[var(--color-accent-ink)]">
              Seleccionado
            </div>
            <div className="text-[11.5px] font-mono-tabular text-[var(--color-accent-ink)]/80 truncate">
              {value}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-[11px] text-[var(--color-accent-ink)] hover:underline font-medium"
          >
            Quitar
          </button>
        </div>
      )}

      <div className="max-h-[280px] overflow-y-auto space-y-4 pr-1">
        {CATEGORIAS.map((cat) => {
          const items = filtrado.filter((i) => i.categoria === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <div className="eyebrow text-[10px] mb-2 px-1">
                {CATEGORIAS_LABEL[cat]}
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {items.map((icono) => {
                  const active = value === icono.value;
                  return (
                    <button
                      key={icono.value}
                      type="button"
                      onClick={() => onChange(icono.value)}
                      title={icono.label}
                      aria-label={icono.label}
                      aria-pressed={active}
                      className={cn(
                        'group aspect-square flex items-center justify-center rounded-[var(--radius-sm)] border transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
                        active
                          ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
                          : 'bg-[var(--color-surface)] border-[var(--color-hairline)] text-[var(--color-ink-2)] hover:border-[var(--color-hairline-strong)] hover:bg-[var(--color-surface-sunken)]',
                      )}
                    >
                      <IconoSVG nombre={icono.value} size={18} />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        {filtrado.length === 0 && (
          <div className="text-center py-8 text-[13px] text-[var(--color-muted)]">
            Sin resultados para &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
}
