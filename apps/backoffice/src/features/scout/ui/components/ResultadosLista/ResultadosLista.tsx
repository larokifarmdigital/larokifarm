import Link from 'next/link';
import { Chip } from '@/shared/components/atoms/Chip';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import { FARMACIAS, TIPO_PRODUCTO_LABEL, type FilaResultado } from '@/core/precios';
import { EUR } from '../../lib/precios';
import { numero } from '../../lib/listas';

const NOMBRE = Object.fromEntries(FARMACIAS.map((f) => [f.clave, f.nombre]));

function hrefDetalle(f: FilaResultado, listaId: string, runId: string) {
  return f.checkId ? `/scout/historial/${f.checkId}?lista=${listaId}&run=${runId}` : null;
}

function nombre(f: FilaResultado) {
  return f.producto?.nombre ?? f.nombreExcel ?? 'Producto sin identificar';
}

function Precio({ f }: { f: FilaResultado }) {
  if (f.estado !== 'hecho') return <span className="text-[var(--color-muted)]">—</span>;
  if (f.producto?.tipo === 'receta') {
    return f.precioOficial != null ? (
      <span>
        <span className="tabular-nums">{EUR.format(f.precioOficial)}</span> <span className="text-[12.5px] text-[var(--color-muted)]">oficial</span>
      </span>
    ) : (
      <span className="text-[var(--color-muted)]">—<span className="sr-only">Con receta: no se vende en webs</span></span>
    );
  }
  if (f.mejorPrecio == null) return <span className="text-[var(--color-muted)]">Sin precio</span>;
  return (
    <span className="inline-flex flex-col items-end">
      <span className="tabular-nums font-semibold text-[var(--color-ink)]">{EUR.format(f.mejorPrecio)}</span>
      {f.mejorFarmacia && <span className="text-[12.5px] text-[var(--color-muted)]">{NOMBRE[f.mejorFarmacia] ?? f.mejorFarmacia}</span>}
    </span>
  );
}

const farmacias = (f: FilaResultado) =>
  f.estado !== 'hecho' ? '' : f.producto?.tipo === 'receta' ? 'No se vende online' : `${f.conPrecio} de ${f.consultadas}`;

function Estado({ f }: { f: FilaResultado }) {
  if (f.estado === 'pendiente') return <span className="text-[var(--color-muted)]">Pendiente</span>;
  if (f.estado === 'error') return <Chip tone="red">Error</Chip>;
  return f.producto ? <Chip tone="neutral">{TIPO_PRODUCTO_LABEL[f.producto.tipo]}</Chip> : null;
}

/** Resultados de una comparación en el orden del Excel (no saltan mientras se compara). */
export function ResultadosLista({ filas, listaId, runId }: { filas: FilaResultado[]; listaId: string; runId: string }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-[10px] border border-[var(--color-hairline)] xl:block">
        <table className="w-full text-left text-[14px]">
          <caption className="sr-only">Resultados de la comparación</caption>
          <thead>
            <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[12.5px] text-[var(--color-muted)]">
              <th scope="col" className="px-4 py-2.5 font-semibold whitespace-nowrap">CN</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Producto</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Tipo</th>
              <th scope="col" className="px-3 py-2.5 font-semibold text-right">Mejor precio</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Farmacias</th>
              <th scope="col" className="w-10 px-4 py-2.5"><span className="sr-only">Abrir</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-hairline)]">
            {filas.map((f) => {
              const href = hrefDetalle(f, listaId, runId);
              return (
                <tr key={f.cn} className={cn('relative', href && 'transition-colors hover:bg-[var(--color-surface-2)]')}>
                  <td className="relative px-4 py-3 whitespace-nowrap tabular-nums text-[var(--color-ink-2)]">{f.cn}</td>
                  <td className="px-3 py-3">
                    {href ? (
                      <Link
                        href={href}
                        className={cn(
                          'inline-flex min-h-6 items-center font-semibold text-[var(--color-ink)] break-words',
                          "after:absolute after:inset-0 after:content-['']",
                          'focus-visible:outline-none focus-visible:underline focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-[var(--color-accent)]',
                        )}
                      >
                        {nombre(f)}
                      </Link>
                    ) : (
                      <span className="font-semibold text-[var(--color-ink-2)] break-words">{nombre(f)}</span>
                    )}
                  </td>
                  <td className="px-3 py-3"><Estado f={f} /></td>
                  <td className="px-3 py-3 text-right whitespace-nowrap"><Precio f={f} /></td>
                  <td className="px-3 py-3 whitespace-nowrap text-[var(--color-ink-2)] tabular-nums">{farmacias(f)}</td>
                  <td className="px-4 py-3 text-right">{href && <NavIcon name="CaretRight" size={14} className="inline-block text-[var(--color-muted)]" />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="m-0 p-0 list-none divide-y divide-[var(--color-hairline)] overflow-hidden rounded-[10px] border border-[var(--color-hairline)] xl:hidden">
        {filas.map((f) => {
          const href = hrefDetalle(f, listaId, runId);
          const dentro = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-[15px] font-semibold text-[var(--color-ink)]">{nombre(f)}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[var(--color-muted)]">
                  <span className="tabular-nums">CN {f.cn}</span>
                  <Estado f={f} />
                </span>
              </span>
              <span className="shrink-0 text-right text-[14px]">
                <Precio f={f} />
                {farmacias(f) && <span className="block text-[12.5px] text-[var(--color-muted)]">{farmacias(f)}</span>}
              </span>
            </>
          );
          return (
            <li key={f.cn}>
              {href ? (
                <Link href={href} className="flex items-start gap-3 min-h-16 px-4 py-3 hover:bg-[var(--color-surface-2)] focus-visible:outline-offset-[-3px]">
                  {dentro}
                </Link>
              ) : (
                <div className="flex items-start gap-3 px-4 py-3">{dentro}</div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function textoRecuento(mostrados: number, total: number) {
  return `${numero(mostrados)} de ${numero(total)} productos`;
}
