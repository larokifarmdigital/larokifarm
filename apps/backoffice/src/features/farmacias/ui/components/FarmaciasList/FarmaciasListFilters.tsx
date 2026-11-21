'use client';

import { useId } from 'react';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Select } from '@/shared/components/atoms/Select';
import { STATUS_FILTERS, type StatusFilter } from './statusMeta';

export const BUSCADOR_FARMACIAS_ID = 'buscador-farmacias';

/**
 * Barra de filtros estándar (igual que Usuarios e Historial): buscador + Select
 * "Estado" con opciones fijas (no aparecen ni desaparecen según los datos).
 * Con un solo Select no hace falta el botón "Filtros" en móvil: buscador y
 * Estado caben en una fila (44 px).
 */
export function FarmaciasListFilters({
  query,
  onQueryChange,
  status,
  onStatusChange,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  status: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
}) {
  const estadoId = useId();
  return (
    <div role="search" aria-label="Filtrar farmacias" className="flex flex-row items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-md">
        <label htmlFor={BUSCADOR_FARMACIAS_ID} className="sr-only">
          Buscar por nombre o ciudad
        </label>
        <NavIcon
          name="MagnifyingGlass"
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
        />
        <input
          id={BUSCADOR_FARMACIAS_ID}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar farmacia"
          autoComplete="off"
          className="field pl-9"
        />
      </div>
      <div className="w-[148px] shrink-0 sm:w-[240px]">
        <label htmlFor={estadoId} className="sr-only">
          Estado
        </label>
        <Select
          id={estadoId}
          value={status}
          onValueChange={(v) => onStatusChange(v as StatusFilter)}
          options={STATUS_FILTERS.map(({ key, label }) => ({ value: key, label }))}
        />
      </div>
    </div>
  );
}
