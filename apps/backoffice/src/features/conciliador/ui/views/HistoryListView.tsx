import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/core/auth';
import { scopeFromSession } from '@/core/shared';
import { getComparisonRepository, type ComparisonStatus } from '@/core/comparisons';
import { ListBusinessesUseCase, getBusinessRepository } from '@/core/businesses';
import { getReportRepository } from '@/core/reports';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { formatUsd } from '@/shared/lib/format';
import { HistoryFilters, QuitarFiltros } from '../components/HistoryFilters';
import { HistoryList, type GrupoHistorial } from '../components/HistoryList';
import { Pagination } from '../components/Pagination';
import { BTN_ACCENT, BTN_SECUNDARIO } from '../lib/botones';
import {
  CLAVES_FILTRO,
  agruparPorDia,
  etiquetaDia,
  horaMadrid,
  rangoPeriodo,
  type Periodo,
} from '../lib/historial';

export interface HistoryListParams {
  q?: string;
  /** URL antigua: ahora es `q`. */
  supplier?: string;
  periodo?: string;
  from?: string;
  to?: string;
  status?: string;
  reportes?: string;
  business?: string;
  page?: string;
}

const BASE = '/albaranes/historial';

function parseStatus(raw?: string): ComparisonStatus | undefined {
  if (raw === 'OK' || raw === 'DISCREPANCIES' || raw === 'ERROR') return raw;
  return undefined;
}

function parsePeriodo(sp: HistoryListParams): Periodo | undefined {
  if (sp.periodo === 'hoy' || sp.periodo === '7d' || sp.periodo === '30d' || sp.periodo === 'fechas') return sp.periodo;
  return sp.from || sp.to ? 'fechas' : undefined;
}

function hrefPagina(sp: HistoryListParams) {
  return (page: number) => {
    const params = new URLSearchParams();
    for (const k of CLAVES_FILTRO) {
      const v = sp[k];
      if (v) params.set(k, v);
    }
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return qs ? `${BASE}?${qs}` : BASE;
  };
}

export async function HistoryListView({ params }: { params: HistoryListParams }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const esAdmin = session.user.role === 'SUPER_ADMIN';
  const hayFiltros = CLAVES_FILTRO.some((k) => params[k]);
  const busqueda = (params.q ?? params.supplier)?.trim() || undefined;

  const [result, negocios] = await Promise.all([
    getComparisonRepository().list(
      scopeFromSession(session),
      {
        ...rangoPeriodo(parsePeriodo(params), params.from, params.to),
        status: parseStatus(params.status),
        search: busqueda,
        withOpenReports: esAdmin && params.reportes === 'abiertos',
        businessSlug: esAdmin ? params.business?.trim() || undefined : undefined,
      },
      { page: Math.max(1, Number(params.page) || 1) },
    ),
    esAdmin ? new ListBusinessesUseCase(getBusinessRepository()).execute(session) : Promise.resolve([]),
  ]);

  const reportes = await getReportRepository().countByComparisonIds(result.items.map((r) => r.id));

  // Solo lo que se pinta. Coste y farmacia, únicamente para SUPER_ADMIN.
  const grupos: GrupoHistorial[] = agruparPorDia(result.items).map((g) => ({
    ymd: g.ymd,
    etiqueta: etiquetaDia(g.ymd),
    filas: g.items.map((c) => {
      const titulo = c.label || c.supplier || 'Proveedor sin identificar';
      const rep = reportes[c.id];
      return {
        id: c.id,
        titulo,
        proveedor: c.supplier && c.supplier !== titulo ? c.supplier : null,
        hora: horaMadrid(c.createdAt),
        usuario: c.user.name,
        estado: c.status,
        numDiscrepancias: c.numDiscrepancies,
        reporte: rep?.open ? 'abierto' : rep?.resolved ? 'resuelto' : null,
        ...(esAdmin ? { negocio: c.business.name, coste: formatUsd(c.geminiCostUsd) } : {}),
      };
    }),
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-10 sm:px-6">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-[24px] sm:text-[28px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
            Historial de conciliaciones
          </h1>
          <p className="m-0 mt-1 text-[15px] text-[var(--color-muted)]">
            Vuelve a consultar cualquier conciliación y descarga su informe.
          </p>
        </div>
        <Link href="/albaranes" className={BTN_ACCENT}>
          <NavIcon name="Plus" size={17} />
          Nueva conciliación
        </Link>
      </header>

      {(hayFiltros || result.total > 0) && (
        <div className="mb-5">
          <HistoryFilters esAdmin={esAdmin} negocios={negocios.map((b) => ({ slug: b.slug, name: b.name }))} />
        </div>
      )}

      <p role="status" className="m-0 mb-3 px-1 text-[14px] text-[var(--color-muted)]">
        {result.total > 0
          ? `${result.total} ${result.total === 1 ? 'conciliación' : 'conciliaciones'}${hayFiltros ? ' con estos filtros' : ''}`
          : hayFiltros
            ? 'No hay conciliaciones con estos filtros'
            : ''}
      </p>

      {result.total === 0 ? (
        <EstadoVacio conFiltros={hayFiltros} />
      ) : (
        <>
          <HistoryList grupos={grupos} />
          <Pagination page={result.page} totalPages={result.totalPages} buildHref={hrefPagina(params)} />
        </>
      )}
    </div>
  );
}

function EstadoVacio({ conFiltros }: { conFiltros: boolean }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-5 py-12 text-center">
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
      >
        <NavIcon name={conFiltros ? 'MagnifyingGlass' : 'ClockCounterClockwise'} size={22} />
      </span>
      <h2 className="m-0 text-[17px] font-bold text-[var(--color-ink)]">
        {conFiltros ? 'No hay conciliaciones con estos filtros' : 'Aún no hay conciliaciones'}
      </h2>
      <p className="m-0 max-w-md text-[14.5px] leading-[1.5] text-[var(--color-muted)]">
        {conFiltros
          ? 'Prueba con otras fechas u otra búsqueda, o quita los filtros para verlas todas.'
          : 'Cuando compruebes un albarán, aparecerá aquí para que puedas volver a consultarlo.'}
      </p>
      {conFiltros ? (
        <QuitarFiltros href={BASE} className={BTN_SECUNDARIO} />
      ) : (
        <Link href="/albaranes" className={BTN_ACCENT}>
          <NavIcon name="Plus" size={17} />
          Nueva conciliación
        </Link>
      )}
    </div>
  );
}
