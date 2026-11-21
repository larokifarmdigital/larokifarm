import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/core/auth';
import { farmaciasDeSesion, scopeFromSession } from '@/core/shared';
import { getComparisonRepository, type ComparisonStatus } from '@/core/comparisons';
import { ListBusinessesUseCase, getBusinessRepository } from '@/core/businesses';
import { getReportRepository } from '@/core/reports';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { PageHeader, ANCHO_PAGINA } from '@/shared/components/molecules/PageHeader';
import { cn } from '@/shared/lib/cn';
import { HistoryFilters, QuitarFiltros } from '../components/HistoryFilters';
import { HistoryList, type FilaHistorial } from '../components/HistoryList';
import { Pagination } from '../components/Pagination';
import { BTN_SECUNDARIO } from '../lib/botones';
import {
  CLAVES_FILTRO,
  fechaFila,
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
  // Admin o personal con varias farmacias: filtro y columna "Farmacia".
  const variasFarmacias = esAdmin || farmaciasDeSesion(session).length > 1;
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
        // El repositorio lo suma al scope: solo acota dentro de sus farmacias.
        businessSlug: variasFarmacias ? params.business?.trim() || undefined : undefined,
      },
      { page: Math.max(1, Number(params.page) || 1) },
    ),
    variasFarmacias ? new ListBusinessesUseCase(getBusinessRepository()).execute(session) : Promise.resolve([]),
  ]);

  const reportes = await getReportRepository().countByComparisonIds(result.items.map((r) => r.id));

  // Solo lo que se pinta. La farmacia, solo si ve más de una (el coste
  // vive en "Datos técnicos" del detalle y en /admin/uso, no en la lista).
  const filas: FilaHistorial[] = result.items.map((c) => {
    // Mismo criterio que Inicio: el proveedor es el título; el nombre del envío, secundario.
    const titulo = c.supplier || c.label || 'Proveedor sin identificar';
    const rep = reportes[c.id];
    const fecha = fechaFila(c.createdAt);
    return {
      id: c.id,
      titulo,
      envio: c.label && c.label !== titulo ? c.label : null,
      fecha: fecha.corta,
      fechaLarga: fecha.larga,
      usuario: c.user.name,
      estado: c.status,
      numDiscrepancias: c.numDiscrepancies,
      reporte: rep?.open ? 'abierto' : rep?.resolved ? 'resuelto' : null,
      ...(variasFarmacias ? { negocio: c.business.name } : {}),
    };
  });

  return (
    <div className={cn(ANCHO_PAGINA, 'pt-6 pb-10')}>
      <PageHeader
        titulo="Historial de conciliaciones"
        descripcion="Vuelve a consultar cualquier conciliación y descarga su informe."
        accion={
          <Button asChild variant="accent">
            <Link href="/albaranes">
              <NavIcon name="Plus" size={16} />
              Nueva conciliación
            </Link>
          </Button>
        }
      />

      {(hayFiltros || result.total > 0) && (
        <div className="mb-3">
          <HistoryFilters esAdmin={esAdmin} total={result.total} negocios={negocios.map((b) => ({ slug: b.slug, name: b.name }))} />
        </div>
      )}

      {/* Recuento + "Quitar filtros": misma fila que en /ajustes/usuarios */}
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3 px-1">
        <p role="status" className="m-0 text-[14px] text-[var(--color-muted)]">
          {result.total > 0
            ? `${result.total} ${result.total === 1 ? 'conciliación' : 'conciliaciones'}${hayFiltros ? ' con estos filtros' : ''}`
            : hayFiltros
              ? 'No hay conciliaciones con estos filtros'
              : ''}
        </p>
        {hayFiltros && result.total > 0 && (
          <QuitarFiltros
            href={BASE}
            conIcono
            className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-[8px] px-3 text-[14px] font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-ink)]"
          />
        )}
      </div>

      {result.total === 0 ? (
        <EstadoVacio conFiltros={hayFiltros} />
      ) : (
        <>
          <HistoryList filas={filas} conFarmacia={variasFarmacias} />
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
        <Button asChild variant="accent">
          <Link href="/albaranes">
            <NavIcon name="Plus" size={16} />
            Nueva conciliación
          </Link>
        </Button>
      )}
    </div>
  );
}
