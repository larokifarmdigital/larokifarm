'use client';

import { useId, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import { CLAVES_FILTRO, PERIODOS } from '../../lib/historial';

const CHIP =
  'inline-flex items-center gap-1.5 min-h-11 sm:min-h-9 px-3.5 rounded-full border text-[14px] font-medium transition-colors';
export const BUSCADOR_ID = 'buscador-historial';

const CHIP_OFF =
  'border-[var(--color-control-border)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]';
const CHIP_ON = 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]';

/**
 * Filtros del historial. Cada chip cambia SOLO su parámetro de la URL (se
 * combinan: "Últimos 7 días" + "Por revisar"); pulsar uno activo lo quita.
 * El buscador aplica solo a los 300 ms de dejar de escribir; no hay "Aplicar".
 */
export function HistoryFilters({
  esAdmin,
  negocios,
}: {
  esAdmin: boolean;
  negocios: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const buscadorId = BUSCADOR_ID;
  const buscadorRef = useRef<HTMLInputElement>(null);
  const negocioId = useId();
  const desdeId = useId();
  const hastaId = useId();

  const periodo = sp.get('periodo') ?? (sp.get('from') || sp.get('to') ? 'fechas' : null);
  const status = sp.get('status');
  const reportes = sp.get('reportes');
  const negocio = sp.get('business') ?? '';
  const hayFiltros = CLAVES_FILTRO.some((k) => sp.get(k));

  // Buscador: estado local + debounce. Si la URL cambia por otra vía (p. ej.
  // "Quitar filtros"), el campo se sincroniza; lo que acabamos de enviar no.
  const qUrl = sp.get('q') ?? sp.get('supplier') ?? '';
  const [texto, setTexto] = useState(qUrl);
  const [qVisto, setQVisto] = useState(qUrl);
  const [enviado, setEnviado] = useState(qUrl);
  if (qUrl !== qVisto) {
    setQVisto(qUrl);
    if (qUrl !== enviado) setTexto(qUrl);
  }
  const temporizador = useRef<number | undefined>(undefined);

  function actualizar(cambios: Record<string, string | null>, modo: 'push' | 'replace' = 'push') {
    const params = new URLSearchParams(sp.toString());
    params.delete('page');
    params.delete('supplier'); // URL antigua: ahora es "q"
    for (const [k, v] of Object.entries(cambios)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    router[modo](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function onBuscar(valor: string) {
    setTexto(valor);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => {
      const limpio = valor.trim();
      setEnviado(limpio);
      actualizar({ q: limpio || null }, 'replace');
    }, 300);
  }

  function elegirPeriodo(id: string) {
    if (periodo === id) actualizar({ periodo: null, from: null, to: null });
    else actualizar({ periodo: id, from: null, to: null });
  }

  function quitarTodo() {
    window.clearTimeout(temporizador.current);
    setTexto('');
    setEnviado('');
    router.push(pathname, { scroll: false });
    // El botón desaparece al no haber filtros: el foco pasa al buscador
    buscadorRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <label htmlFor={buscadorId} className="sr-only">
            Buscar por proveedor o nombre
          </label>
          <NavIcon
            name="MagnifyingGlass"
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            id={buscadorId}
            ref={buscadorRef}
            type="search"
            value={texto}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder="Buscar por proveedor o nombre"
            autoComplete="off"
            className="field min-h-11 pl-9 text-[15px]"
          />
        </div>
        {esAdmin && negocios.length > 1 && (
          <div className="sm:w-64">
            <label htmlFor={negocioId} className="sr-only">
              Farmacia
            </label>
            <select
              id={negocioId}
              value={negocio}
              onChange={(e) => actualizar({ business: e.target.value || null })}
              className="field min-h-11 text-[15px]"
            >
              <option value="">Todas las farmacias</option>
              {negocios.map((n) => (
                <option key={n.slug} value={n.slug}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Fecha" className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={periodo === p.id}
              onClick={() => elegirPeriodo(p.id)}
              className={cn(CHIP, periodo === p.id ? CHIP_ON : CHIP_OFF)}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={periodo === 'fechas'}
            onClick={() => elegirPeriodo('fechas')}
            className={cn(CHIP, periodo === 'fechas' ? CHIP_ON : CHIP_OFF)}
          >
            <NavIcon name="CalendarBlank" size={15} />
            Elegir fechas
          </button>
        </div>

        <span aria-hidden className="hidden sm:block h-6 w-px bg-[var(--color-hairline-strong)] mx-1" />

        <div role="group" aria-label="Resultado" className="flex flex-wrap gap-2">
          {[
            { id: 'DISCREPANCIES', label: 'Por revisar' },
            { id: 'ERROR', label: 'No se pudo comprobar' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={status === s.id}
              onClick={() => actualizar({ status: status === s.id ? null : s.id })}
              className={cn(CHIP, status === s.id ? CHIP_ON : CHIP_OFF)}
            >
              {s.label}
            </button>
          ))}
          {esAdmin && (
            <button
              type="button"
              aria-pressed={reportes === 'abiertos'}
              onClick={() => actualizar({ reportes: reportes === 'abiertos' ? null : 'abiertos' })}
              className={cn(CHIP, reportes === 'abiertos' ? CHIP_ON : CHIP_OFF)}
            >
              Con reportes abiertos
            </button>
          )}
        </div>

        {hayFiltros && (
          <button
            type="button"
            onClick={quitarTodo}
            className="inline-flex items-center gap-1 min-h-11 sm:min-h-9 px-3 rounded-[8px] text-[14px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
          >
            <NavIcon name="X" size={14} />
            Quitar filtros
          </button>
        )}
      </div>

      {periodo === 'fechas' && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={desdeId} className="mb-1 block text-[13.5px] font-medium text-[var(--color-ink-2)]">
              Desde
            </label>
            <input
              id={desdeId}
              type="date"
              value={sp.get('from') ?? ''}
              max={sp.get('to') ?? undefined}
              onChange={(e) => actualizar({ periodo: 'fechas', from: e.target.value || null }, 'replace')}
              className="field min-h-11 w-auto text-[15px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-accent)]"
            />
          </div>
          <div>
            <label htmlFor={hastaId} className="mb-1 block text-[13.5px] font-medium text-[var(--color-ink-2)]">
              Hasta
            </label>
            <input
              id={hastaId}
              type="date"
              value={sp.get('to') ?? ''}
              min={sp.get('from') ?? undefined}
              onChange={(e) => actualizar({ periodo: 'fechas', to: e.target.value || null }, 'replace')}
              className="field min-h-11 w-auto text-[15px] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--color-accent)]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
