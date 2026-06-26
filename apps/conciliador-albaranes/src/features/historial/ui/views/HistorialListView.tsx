/**
 * Vista de la página /historial.
 *
 * Recibe los `searchParams` ya tipados y orquesta: parsear filtros → llamar al
 * repositorio (sin use case porque es passthrough puro) → renderizar.
 *
 * Server Component: la sesión se obtiene aquí (no en la page) para que la page
 * sea un thin wrapper de routing.
 */
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth';
import {
  getComparisonRepository,
  scopeFromSession,
  type ComparisonStatus,
} from '@/shared/core';
import { HistorialFilters } from '../components/HistorialFilters';
import { HistorialTable } from '../components/HistorialTable';
import { Paginacion } from '../components/Paginacion';

export interface HistorialListParams {
  desde?: string;
  hasta?: string;
  estado?: string;
  proveedor?: string;
  business?: string;
  page?: string;
}

function parseEstado(raw?: string): ComparisonStatus | undefined {
  if (raw === 'OK' || raw === 'DISCREPANCIAS' || raw === 'ERROR') return raw;
  return undefined;
}

function parseDate(raw?: string): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function endOfDay(d: Date): Date {
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return end;
}

function buildHrefBuilder(sp: HistorialListParams) {
  return function buildHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (sp.desde) params.set('desde', sp.desde);
    if (sp.hasta) params.set('hasta', sp.hasta);
    if (sp.estado) params.set('estado', sp.estado);
    if (sp.proveedor) params.set('proveedor', sp.proveedor);
    if (sp.business) params.set('business', sp.business);
    params.set('page', String(targetPage));
    return `/historial?${params.toString()}`;
  };
}

export async function HistorialListView({ params }: { params: HistorialListParams }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const repo = getComparisonRepository();
  const hastaRaw = parseDate(params.hasta);

  const result = await repo.list(
    scopeFromSession(session),
    {
      desde: parseDate(params.desde),
      hasta: hastaRaw ? endOfDay(hastaRaw) : undefined,
      estado: parseEstado(params.estado),
      proveedor: params.proveedor?.trim() || undefined,
      businessSlug: params.business?.trim() || undefined,
    },
    { page: Math.max(1, Number(params.page) || 1) },
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Historial de comparaciones
        </h1>
      </div>

      <div className="mb-4">
        <HistorialFilters showBusinessFilter={session.user.role === 'SUPER_ADMIN'} />
      </div>

      <HistorialTable rows={result.items} role={session.user.role} />
      <Paginacion
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        buildHref={buildHrefBuilder(params)}
      />
    </main>
  );
}
