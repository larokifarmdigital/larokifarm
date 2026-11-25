import Link from 'next/link';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
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

      <TablaMeses meses={meses} mes={mes} actual={actual} max={max} />
    </section>
  );
}

const mayuscula = (t: string) => t[0]!.toUpperCase() + t.slice(1);

/** Los mismos datos del gráfico en texto (plegada): del mes más reciente al más antiguo. */
function TablaMeses({ meses, mes, actual, max }: { meses: UsoIaMes[]; mes: string; actual: string; max: number }) {
  const total = meses.reduce(
    (t, m) => ({ gasto: t.gasto + m.gasto, conciliaciones: t.conciliaciones + m.conciliaciones, traducciones: t.traducciones + m.traducciones }),
    { gasto: 0, conciliaciones: 0, traducciones: 0 },
  );
  const num = (n: number) => n.toLocaleString('es-ES');
  return (
    <details className="group/tabla mt-4 border-t border-[var(--color-hairline)] pt-3">
      <summary className="-mx-2 inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-[8px] px-2 text-[14px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] sm:min-h-8 [&::-webkit-details-marker]:hidden">
        <NavIcon name="CaretRight" size={14} className="shrink-0 transition-transform group-open/tabla:rotate-90 motion-reduce:transition-none" />
        <span className="group-open/tabla:hidden">Ver como tabla</span>
        <span className="hidden group-open/tabla:inline">Ocultar la tabla</span>
      </summary>

      <div className="mt-3 overflow-hidden rounded-[10px] border border-[var(--color-hairline)]">
        <table className="w-full text-left text-[14px]">
          <caption className="sr-only">Gasto de IA por mes, del más reciente al más antiguo</caption>
          <thead>
            <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[12.5px] text-[var(--color-muted)]">
              <th scope="col" className="px-4 py-2.5 font-semibold">Mes</th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">Conciliaciones</th>
              <th scope="col" className="hidden px-3 py-2.5 text-right font-semibold sm:table-cell">Traducciones</th>
              <th scope="col" className="px-4 py-2.5 text-right font-semibold">Gastado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-hairline)]">
            {[...meses].reverse().map((m) => {
              const elegido = m.clave === mes;
              const vacio = m.usos === 0;
              return (
                <tr key={m.clave} className={cn(elegido && 'bg-[var(--color-accent-soft)]')}>
                  <th scope="row" className="px-4 py-2.5 font-normal">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {elegido ? (
                        <span className="font-semibold text-[var(--color-ink)]" aria-current="true">
                          {mayuscula(m.etiqueta)}
                        </span>
                      ) : (
                        <Link
                          href={hrefMes(m.clave, actual)}
                          scroll={false}
                          className="inline-flex min-h-6 items-center text-[var(--color-accent)] underline-offset-2 hover:underline"
                        >
                          {mayuscula(m.etiqueta)}
                        </Link>
                      )}
                      {elegido && <span className="chip chip-accent">Viendo</span>}
                      {m.clave === actual && !elegido && <span className="text-[12.5px] text-[var(--color-muted)]">este mes</span>}
                    </span>
                    {/* En móvil no caben las columnas de usos: van debajo del mes */}
                    <span className={cn('mt-0.5 block text-[12.5px] sm:hidden', vacio ? 'text-[var(--color-muted)]' : 'text-[var(--color-ink-2)]')}>
                      {vacio ? 'Sin uso' : `${num(m.conciliaciones)} conc. · ${num(m.traducciones)} trad.`}
                    </span>
                  </th>
                  <td className={cn('hidden px-3 py-2.5 text-right tabular-nums sm:table-cell', vacio ? 'text-[var(--color-muted)]' : 'text-[var(--color-ink-2)]')}>
                    {num(m.conciliaciones)}
                  </td>
                  <td className={cn('hidden px-3 py-2.5 text-right tabular-nums sm:table-cell', vacio ? 'text-[var(--color-muted)]' : 'text-[var(--color-ink-2)]')}>
                    {num(m.traducciones)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={cn('block tabular-nums', vacio ? 'text-[var(--color-muted)]' : 'font-semibold text-[var(--color-ink)]')}>
                      {dolares(m.gasto)}
                    </span>
                    {m.gasto > 0 && (
                      <span aria-hidden className="ml-auto mt-1 block h-1 w-16 overflow-hidden rounded-full bg-[var(--color-surface-sunken)] sm:w-24">
                        <span className="ml-auto block h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.max(4, (m.gasto / max) * 100)}%` }} />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-[var(--color-hairline-strong)] bg-[var(--color-surface-2)]">
              <th scope="row" className="px-4 py-2.5 font-semibold text-[var(--color-ink)]">
                Total 12 meses
                <span className="mt-0.5 block text-[12.5px] font-normal text-[var(--color-ink-2)] sm:hidden">
                  {num(total.conciliaciones)} conc. · {num(total.traducciones)} trad.
                </span>
              </th>
              <td className="hidden px-3 py-2.5 text-right font-semibold tabular-nums text-[var(--color-ink)] sm:table-cell">{num(total.conciliaciones)}</td>
              <td className="hidden px-3 py-2.5 text-right font-semibold tabular-nums text-[var(--color-ink)] sm:table-cell">{num(total.traducciones)}</td>
              <td className="px-4 py-2.5 text-right font-bold tabular-nums text-[var(--color-ink)]">{dolares(total.gasto)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="m-0 mt-2 text-[13px] text-[var(--color-muted)]">Pulsa un mes para ver su detalle por farmacia y por persona.</p>
    </details>
  );
}
