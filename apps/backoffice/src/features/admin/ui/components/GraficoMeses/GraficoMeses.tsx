import Link from 'next/link';
import { cn } from '@/shared/lib/cn';
import type { UsoIaMes } from '../../../data/usoData';
import { dolares } from '../../lib/dinero';

const hrefMes = (clave: string, actual: string) => (clave === actual ? '/admin/uso' : `/admin/uso?mes=${clave}`);

/**
 * Gasto de IA de los últimos 12 meses (una sola serie: barras de un color).
 * Cada columna es un enlace a ese mes; el valor sale al pasar el ratón o con
 * el foco, y "Ver como tabla" da los datos en texto.
 */
export function GraficoMeses({ meses, mes }: { meses: UsoIaMes[]; mes: string }) {
  const actual = meses.at(-1)!.clave;
  const max = Math.max(...meses.map((m) => m.gasto));
  const sinDatos = max === 0;
  return (
    <section aria-labelledby="grafico-titulo" className="card mb-6 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="grafico-titulo" className="m-0 text-[16px] font-bold text-[var(--color-ink)]">
          Gasto de los últimos 12 meses
        </h2>
        <p className="m-0 text-[13px] text-[var(--color-muted)]">Pulsa un mes para verlo en detalle.</p>
      </div>

      {sinDatos ? (
        <p className="m-0 py-6 text-center text-[14px] text-[var(--color-muted)]">Todavía no hay gasto de IA en estos meses.</p>
      ) : (
        <div className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-6 border-t border-dashed border-[var(--color-hairline)]" />
          <span aria-hidden className="pointer-events-none absolute right-0 top-0 text-[11.5px] text-[var(--color-muted)] tabular-nums">
            {dolares(max)}
          </span>
          <ol className="m-0 flex list-none items-stretch gap-0 p-0 pt-6 sm:gap-2" aria-label="Gasto por mes">
            {meses.map((m) => {
              const elegido = m.clave === mes;
              const alto = m.gasto > 0 ? Math.max(2, (m.gasto / max) * 100) : 0;
              return (
                <li key={m.clave} className="flex min-w-0 flex-1">
                  <Link
                    href={hrefMes(m.clave, actual)}
                    scroll={false}
                    aria-current={elegido ? 'true' : undefined}
                    aria-label={`${m.etiqueta}: ${dolares(m.gasto)}, ${m.usos} ${m.usos === 1 ? 'uso' : 'usos'}`}
                    className="group relative flex w-full flex-col items-center rounded-[6px] pt-1 hover:bg-[var(--color-surface-2)]"
                  >
                    <span className="relative flex h-[120px] w-full items-end justify-center">
                      <span
                        className="w-[70%] max-w-[28px] rounded-t-[4px] bg-[var(--color-accent)]"
                        style={{ height: `${alto}%` }}
                      />
                      <span
                        aria-hidden
                        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-[var(--color-ink)] px-2 py-1 text-[12px] text-white shadow-[var(--shadow-elevated)] group-hover:block group-focus-visible:block"
                      >
                        {dolares(m.gasto)} · {m.usos} {m.usos === 1 ? 'uso' : 'usos'}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        'mt-1.5 border-t-2 pt-1 text-[11.5px] leading-tight sm:text-[12.5px]',
                        elegido
                          ? 'border-[var(--color-ink)] font-bold text-[var(--color-ink)]'
                          : 'border-transparent text-[var(--color-muted)]',
                      )}
                    >
                      {m.corta}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <details className="group/tabla mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[6px] px-1 text-[14px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-surface-2)] sm:min-h-8">
          Ver como tabla
        </summary>
        <table className="mt-2 w-full max-w-[420px] text-left text-[14px]">
          <caption className="sr-only">Gasto de IA por mes</caption>
          <thead>
            <tr className="border-b border-[var(--color-hairline)] text-[12.5px] text-[var(--color-muted)]">
              <th scope="col" className="py-1.5 pr-3 font-semibold">Mes</th>
              <th scope="col" className="py-1.5 pr-3 text-right font-semibold">Gastado</th>
              <th scope="col" className="py-1.5 text-right font-semibold">Usos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-hairline)]">
            {[...meses].reverse().map((m) => (
              <tr key={m.clave}>
                <th scope="row" className="py-1.5 pr-3 font-normal text-[var(--color-ink-2)]">{m.etiqueta}</th>
                <td className="py-1.5 pr-3 text-right tabular-nums text-[var(--color-ink)]">{dolares(m.gasto)}</td>
                <td className="py-1.5 text-right tabular-nums text-[var(--color-ink-2)]">{m.usos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
