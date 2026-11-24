import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { ANCHO_PAGINA, PageHeader } from '@/shared/components/molecules/PageHeader';
import { cn } from '@/shared/lib/cn';
import { REUTILIZAR_MS, getPriceListRepository, type FiltroResultado } from '@/core/precios';
import { Pagination } from '@/features/conciliador/ui/components/Pagination';
import { AccionesLista } from '../../components/AccionesLista';
import { EnfocarTitulo } from '../../components/EnfocarTitulo';
import { QuitarFiltrosResultados, ResultadosFiltros, ResultadosLista, textoRecuento } from '../../components/ResultadosLista';
import { AccionPrincipalLista, TarjetaComparacion } from '../../components/TarjetaComparacion';
import { OPCIONES_RESULTADO_LISTA, valido } from '../../lib/historialPrecios';
import { activa, numero } from '../../lib/listas';
import { cuando } from '../../lib/precios';

const POR_PAGINA = 50;

export type ListaParams = { run?: string; q?: string; resultado?: string; page?: string };

export async function ListaView({ id, params, esAdmin }: { id: string; params: ListaParams; esAdmin: boolean }) {
  const repo = getPriceListRepository();
  const datos = await repo.obtener(id);
  if (!datos) notFound();
  const { lista, ejecuciones } = datos;
  // Un ?run= desconocido se ignora (como en Historial).
  const ejecucion = ejecuciones.find((e) => e.id === params.run) ?? ejecuciones[0] ?? null;
  const esLaUltima = !ejecucion || ejecucion.id === ejecuciones[0]?.id;
  const filtro = valido(params.resultado, OPCIONES_RESULTADO_LISTA) as FiltroResultado | undefined;
  const q = params.q?.trim().slice(0, 80) || undefined;
  const pagina = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const [resultados, recientes] = await Promise.all([
    ejecucion ? repo.resultados(ejecucion.id, { pagina, porPagina: POR_PAGINA, texto: q, filtro }) : null,
    ejecucion ? 0 : repo.cuantosRecientes(await repo.cnsDeLista(id), REUTILIZAR_MS),
  ]);
  const hayFiltros = !!(q || filtro);
  const hrefPagina = (p: number) => {
    const sp = new URLSearchParams();
    if (!esLaUltima && ejecucion) sp.set('run', ejecucion.id);
    if (q) sp.set('q', q);
    if (filtro) sp.set('resultado', filtro);
    if (p > 1) sp.set('page', String(p));
    const s = sp.toString();
    return `/scout/listas/${id}${s ? `?${s}` : ''}`;
  };

  return (
    <div className={cn(ANCHO_PAGINA, 'pt-6 pb-10')}>
      <EnfocarTitulo />
      <Link href="/scout/listas" className="mb-2 inline-flex min-h-11 sm:min-h-8 items-center gap-1.5 text-[14px] font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">
        <NavIcon name="ArrowLeft" size={15} />
        Listas
      </Link>
      <PageHeader
        titulo={lista.nombre}
        descripcion={`${numero(lista.productos)} productos · subida ${cuando(lista.creadaEn).replace(/ a las \d\d:\d\d$/, '')}${esAdmin && lista.autor ? ` por ${lista.autor}` : ''} · ${lista.archivo}`}
        accion={
          <div className="flex items-center gap-2">
            <AccionPrincipalLista listaId={id} ejecucion={ejecucion} esLaUltima={esLaUltima} />
            <AccionesLista
              lista={lista}
              excelRunId={ejecucion && ejecucion.hechos > 0 ? ejecucion.id : null}
              activa={ejecuciones.some((e) => activa(e))}
              ejecuciones={ejecuciones.length}
              trasEliminar="listas"
            />
          </div>
        }
      />

      <div className="flex flex-col gap-4 sm:gap-5">
        <TarjetaComparacion listaId={id} ejecucion={ejecucion} ejecuciones={ejecuciones} esLaUltima={esLaUltima} productos={lista.productos} recientes={recientes} />

        {ejecucion && resultados && (
          <section className="card p-5 sm:p-6" aria-labelledby="resultados-titulo">
            <h2 id="resultados-titulo" className="m-0 mb-4 text-[17px] font-semibold text-[var(--color-ink)]">
              Resultados
            </h2>
            <Suspense>
              <ResultadosFiltros total={resultados.total} conPendientes={activa(ejecucion) || ejecucion.hechos < ejecucion.total} />
            </Suspense>
            <div className="my-3 flex min-h-11 items-center justify-between gap-3 px-1">
              <p className="m-0 text-[14px] text-[var(--color-muted)]">{textoRecuento(resultados.total, lista.productos)}</p>
              {hayFiltros && (
                <Suspense>
                  <QuitarFiltrosResultados className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-[8px] px-3 text-[14px] font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]" />
                </Suspense>
              )}
            </div>
            {resultados.total === 0 ? (
              <p className="m-0 rounded-[10px] bg-[var(--color-surface-2)] px-4 py-6 text-center text-[14.5px] text-[var(--color-ink-2)]">
                Ningún producto coincide con estos filtros.
              </p>
            ) : (
              <>
                <ResultadosLista filas={resultados.items} listaId={id} runId={ejecucion.id} />
                <Pagination page={pagina} totalPages={Math.max(1, Math.ceil(resultados.total / POR_PAGINA))} buildHref={hrefPagina} />
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
