'use client';

import { useState } from 'react';
import type { ReconciledLine } from '@/core/engine';
import { CLASE_TONO, etiquetaLinea, tonoLinea } from '@/features/conciliador/ui/lib/lineas';
import { cn } from '@/shared/lib/cn';

const fmt = (v: number | null) =>
  v === null ? '—' : v.toLocaleString('es-ES', { maximumFractionDigits: 2 });

/**
 * Líneas de una conciliación.
 * - Por defecto solo "lo que hay que revisar" (faltas, diferencias, sin pedir).
 * - Escritorio: tabla. Móvil: una tarjeta por línea (la tabla de 820px no cabía
 *   y la columna de estado quedaba fuera de pantalla).
 * - Estados en lenguaje llano; el valor que no cuadra va resaltado.
 */
export function ReconciliationTable({ lines }: { lines: ReconciledLine[] }) {
  const porRevisar = lines.filter((l) => l.status !== 'OK' && l.status !== 'GIFT');
  const [verTodas, setVerTodas] = useState(porRevisar.length === 0);
  const visibles = verTodas ? lines : porRevisar;

  if (lines.length === 0) {
    return <p className="m-0 p-6 text-center text-[14px] text-[var(--color-muted)]">No hay líneas para mostrar.</p>;
  }

  const mal = (l: ReconciledLine, campo: 'units' | 'price' | 'discount') =>
    l.discrepancies.includes(campo) ? 'font-bold text-[var(--color-red-ink)] bg-[var(--color-red-soft)] rounded px-1' : '';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-[var(--color-hairline)]">
        <p className="m-0 text-[14px] text-[var(--color-ink-2)]">
          {verTodas
            ? `Todas las líneas (${lines.length})`
            : porRevisar.length > 0
              ? `${porRevisar.length} ${porRevisar.length === 1 ? 'línea' : 'líneas'} por revisar de ${lines.length}`
              : 'Todo coincide'}
        </p>
        {porRevisar.length > 0 && porRevisar.length < lines.length && (
          <button
            type="button"
            onClick={() => setVerTodas((v) => !v)}
            aria-pressed={verTodas}
            className={cn(
              'min-h-11 px-3 rounded-[8px] text-[14px] font-medium hover:bg-[var(--color-accent-soft)]',
              verTodas ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]' : 'text-[var(--color-accent)]',
            )}
          >
            {/* Etiqueta fija + aria-pressed (un toggle no debe cambiar de nombre) */}
            Mostrar todas las líneas
          </button>
        )}
      </div>

      {/* Móvil: tarjetas */}
      <ul className="md:hidden divide-y divide-[var(--color-hairline)]">
        {visibles.map((l, i) => (
          <li key={`${l.nationalCode}-${i}`} className="px-4 py-3.5">
            <p className="m-0 text-[14.5px] font-medium text-[var(--color-ink)]">{l.description}</p>
            <p className="m-0 mt-0.5 text-[12.5px] text-[var(--color-muted)] font-mono-tabular">CN {l.nationalCode || '—'}</p>
            <span className={cn('mt-2 inline-block rounded-[6px] px-2 py-1 text-[13px] font-medium', CLASE_TONO[tonoLinea(l)])}>
              {etiquetaLinea(l)}
            </span>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-[13px]">
              <div>
                <dt className="text-[var(--color-muted)]">Unidades</dt>
                <dd className="m-0 text-[var(--color-ink)]">
                  <span className={mal(l, 'units')}>{fmt(l.unitsOrdered)} → {fmt(l.unitsDelivered)}</span>
                  {l.freeUnitsDelivered ? <span className="text-[var(--color-green-ink)]"> +{l.freeUnitsDelivered}</span> : null}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Precio</dt>
                <dd className="m-0 text-[var(--color-ink)]"><span className={mal(l, 'price')}>{l.priceDelivered === null ? '—' : `${fmt(l.priceDelivered)} €`}</span></dd>
              </div>
              <div>
                <dt className="text-[var(--color-muted)]">Dto.</dt>
                <dd className="m-0 text-[var(--color-ink)]"><span className={mal(l, 'discount')}>{l.discountDelivered === null ? '—' : `${fmt(l.discountDelivered)} %`}</span></dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-[14px]">
          <caption className="sr-only">Líneas de la conciliación: pedido frente a lo recibido</caption>
          <thead>
            <tr className="bg-[var(--color-surface-2)] text-left text-[12.5px] text-[var(--color-muted)]">
              <th scope="col" className="px-4 py-2.5 font-semibold whitespace-nowrap">CN</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Producto</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Qué pasa</th>
              <th scope="col" className="px-3 py-2.5 font-semibold text-right">Uds. pedidas</th>
              <th scope="col" className="px-3 py-2.5 font-semibold text-right">Uds. recibidas</th>
              <th scope="col" className="px-3 py-2.5 font-semibold text-right">Precio pedido</th>
              <th scope="col" className="px-3 py-2.5 font-semibold text-right">Precio albarán</th>
              <th scope="col" className="px-3 py-2.5 font-semibold text-right">Dto. pedido</th>
              <th scope="col" className="px-4 py-2.5 font-semibold text-right">Dto. albarán</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-hairline)]">
            {visibles.map((l, i) => (
              <tr key={`${l.nationalCode}-${i}`} className="align-top">
                <td className="px-4 py-2.5 whitespace-nowrap tabular-nums text-[var(--color-ink-2)]">{l.nationalCode || '—'}</td>
                <td className="px-3 py-2.5 text-[var(--color-ink)]">{l.description}</td>
                <td className="px-3 py-2.5">
                  <span className={cn('inline-block rounded-[6px] px-2 py-0.5 text-[13px] font-medium', CLASE_TONO[tonoLinea(l)])}>
                    {etiquetaLinea(l)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums"><span className={mal(l, 'units')}>{fmt(l.unitsOrdered)}</span></td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <span className={mal(l, 'units')}>{fmt(l.unitsDelivered)}</span>
                  {l.freeUnitsDelivered ? <span className="block text-[12.5px] text-[var(--color-green-ink)]">+{l.freeUnitsDelivered} regalo</span> : null}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums"><span className={mal(l, 'price')}>{fmt(l.priceOrdered)}</span></td>
                <td className="px-3 py-2.5 text-right tabular-nums"><span className={mal(l, 'price')}>{fmt(l.priceDelivered)}</span></td>
                <td className="px-3 py-2.5 text-right tabular-nums"><span className={mal(l, 'discount')}>{fmt(l.discountOrdered)}</span></td>
                <td className="px-4 py-2.5 text-right tabular-nums"><span className={mal(l, 'discount')}>{fmt(l.discountDelivered)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
