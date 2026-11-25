import Link from 'next/link';
import { Button } from '@/shared/components/atoms/Button';
import { Chip } from '@/shared/components/atoms/Chip';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { ANCHO_PAGINA, PageHeader } from '@/shared/components/molecules/PageHeader';
import { cn } from '@/shared/lib/cn';
import { fechaFila, rangoPeriodo, type Periodo } from '@/shared/lib/fechasMadrid';
import { getPriceCheckRepository, TIPO_PRODUCTO_LABEL, type ConsultaResumen, type ResultadoHistorial } from '@/core/precios';
import { Pagination } from '@/features/conciliador/ui/components/Pagination';
import { HistorialFiltros, QuitarFiltrosPrecios } from '../../components/HistorialFiltros';
import { OPCIONES_PERIODO, OPCIONES_RESULTADO, valido } from '../../lib/historialPrecios';
import { EUR, TIPO_TONO } from '../../lib/precios';

const POR_PAGINA = 20;
const BASE = '/scout/historial';

export type HistorialPreciosParams = { q?: string; periodo?: string; resultado?: string; page?: string };

function MejorPrecio({ c }: { c: ConsultaResumen }) {
  if (c.producto.tipo === 'receta') {
    return c.precioOficial != null ? (
      <span>
        <span className="tabular-nums">{EUR.format(c.precioOficial)}</span> <span className="text-[12.5px] text-[var(--color-muted)]">oficial</span>
      </span>
    ) : (
      <span className="text-[var(--color-muted)]">—</span>
    );
  }
  return c.mejorPrecio != null ? <span className="tabular-nums font-semibold">{EUR.format(c.mejorPrecio)}</span> : <span className="text-[var(--color-muted)]">—</span>;
}

const conPrecio = (c: ConsultaResumen) =>
  c.producto.tipo === 'receta' ? 'No se vende online' : c.conPrecio > 0 ? `${c.conPrecio} de ${c.consultadas} con precio` : 'Sin precio verificado';

export async function HistorialPreciosView({ params }: { params: HistorialPreciosParams }) {
  const periodo = valido(params.periodo, OPCIONES_PERIODO) as Periodo | undefined;
  const resultado = valido(params.resultado, OPCIONES_RESULTADO) as ResultadoHistorial | undefined;
  const q = params.q?.trim().slice(0, 80) || undefined;
  const pagina = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const { from } = rangoPeriodo(periodo, undefined, undefined);
  const { items, total } = await getPriceCheckRepository().listar({ texto: q, desde: from, resultado, pagina, porPagina: POR_PAGINA });
  const hayFiltros = !!(q || periodo || resultado);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const hrefPagina = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (periodo) sp.set('periodo', periodo);
    if (resultado) sp.set('resultado', resultado);
    if (p > 1) sp.set('page', String(p));
    const s = sp.toString();
    return s ? `${BASE}?${s}` : BASE;
  };

  return (
    <div className={cn(ANCHO_PAGINA, 'pt-6 pb-10')}>
      <PageHeader
        titulo="Historial de precios"
        descripcion="Todas las consultas de precios. Ábrelas para ver lo que encontramos ese día."
        accion={
          <Button asChild variant="accent">
            <Link href="/scout">
              <NavIcon name="MagnifyingGlass" size={16} />
              Comparar precio
            </Link>
          </Button>
        }
      />

      {(hayFiltros || total > 0) && (
        <div className="mb-3">
          <HistorialFiltros total={total} />
        </div>
      )}

      <div className="mb-3 flex min-h-11 items-center justify-between gap-3 px-1">
        <p role="status" className="m-0 text-[14px] text-[var(--color-muted)]">
          {total > 0 ? `${total} ${total === 1 ? 'consulta' : 'consultas'}${hayFiltros ? ' con estos filtros' : ''}` : ''}
        </p>
        {hayFiltros && total > 0 && (
          <QuitarFiltrosPrecios className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-[8px] px-3 text-[14px] font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]" />
        )}
      </div>

      {total === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-5 py-12 text-center">
          <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <NavIcon name={hayFiltros ? 'MagnifyingGlass' : 'ClockCounterClockwise'} size={22} />
          </span>
          <h2 className="m-0 text-[17px] font-bold text-[var(--color-ink)]">
            {hayFiltros ? 'Ninguna consulta coincide con los filtros' : 'Aún no hay consultas de precios'}
          </h2>
          {hayFiltros ? (
            <QuitarFiltrosPrecios className="inline-flex min-h-11 items-center gap-1.5 rounded-[8px] border border-[var(--color-hairline-strong)] bg-[var(--color-surface)] px-4 text-[14px] font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]" />
          ) : (
            <Button asChild variant="accent">
              <Link href="/scout">Comparar precio</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="card hidden overflow-hidden p-0 xl:block">
            <div className="overflow-x-auto" role="region" aria-label="Historial de precios" tabIndex={0}>
              <table className="w-full text-left text-[14px]">
                <caption className="sr-only">Consultas de precios, de la más reciente a la más antigua</caption>
                <thead>
                  <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[12.5px] text-[var(--color-muted)]">
                    <th scope="col" className="px-5 py-2.5 font-semibold whitespace-nowrap">CN</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Producto</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Fecha</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold text-right">Mejor precio</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Con precio</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Quién</th>
                    <th scope="col" className="w-10 px-5 py-2.5"><span className="sr-only">Abrir</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-hairline)]">
                  {items.map((c) => {
                    const f = fechaFila(new Date(c.creadaEn));
                    return (
                      <tr key={c.id} className="relative transition-colors hover:bg-[var(--color-surface-2)]">
                        <td className="relative px-5 py-3 whitespace-nowrap tabular-nums text-[var(--color-ink-2)]">{c.producto.cn}</td>
                        <td className="px-3 py-3">
                          <Link
                            href={`${BASE}/${c.id}`}
                            className={cn(
                              'inline-flex min-h-6 items-center font-semibold text-[var(--color-ink)] break-words',
                              "after:absolute after:inset-0 after:content-['']",
                              'focus-visible:outline-none focus-visible:underline focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-[var(--color-accent)]',
                            )}
                          >
                            {c.producto.nombre}
                            <span className="sr-only">, {f.larga}</span>
                          </Link>
                          <span className="mt-0.5 flex items-center gap-2 text-[13px] text-[var(--color-muted)]">
                            <Chip tone={TIPO_TONO[c.producto.tipo]}>{TIPO_PRODUCTO_LABEL[c.producto.tipo]}</Chip>
                          </span>
                        </td>
                        <td className="relative px-3 py-3 whitespace-nowrap tabular-nums text-[var(--color-ink-2)]">{f.corta}</td>
                        <td className="relative px-3 py-3 text-right whitespace-nowrap text-[var(--color-ink)]"><MejorPrecio c={c} /></td>
                        <td className="relative px-3 py-3 whitespace-nowrap text-[var(--color-ink-2)]">{conPrecio(c)}</td>
                        <td className="relative px-3 py-3 text-[var(--color-ink-2)]">{c.autor}</td>
                        <td className="px-5 py-3 text-right"><NavIcon name="CaretRight" size={14} className="inline-block text-[var(--color-muted)]" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <ul className="card divide-y divide-[var(--color-hairline)] overflow-hidden p-0 xl:hidden">
            {items.map((c) => {
              const f = fechaFila(new Date(c.creadaEn));
              return (
                <li key={c.id}>
                  <Link href={`${BASE}/${c.id}`} className="flex items-center gap-3 min-h-16 px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors focus-visible:outline-offset-[-3px]">
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-[15px] font-semibold text-[var(--color-ink)]">{c.producto.nombre}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[var(--color-ink-2)]">
                        <MejorPrecio c={c} />
                        {c.producto.tipo !== 'receta' && (
                          <>
                            <span aria-hidden>·</span>
                            <span>{conPrecio(c)}</span>
                          </>
                        )}
                        <Chip tone={TIPO_TONO[c.producto.tipo]}>{TIPO_PRODUCTO_LABEL[c.producto.tipo]}</Chip>
                      </span>
                      <span className="mt-1 block text-[13px] text-[var(--color-muted)]">{[f.corta, c.autor].filter(Boolean).join(' · ')}</span>
                    </span>
                    <NavIcon name="CaretRight" size={14} className="shrink-0 text-[var(--color-muted)]" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination page={pagina} totalPages={totalPaginas} buildHref={hrefPagina} />
        </>
      )}
    </div>
  );
}
