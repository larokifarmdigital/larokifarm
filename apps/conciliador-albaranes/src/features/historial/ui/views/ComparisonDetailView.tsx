/**
 * Vista de la página /historial/[id].
 *
 * Usa el use case `GetComparisonDetailUseCase` (combina repo + storage para
 * generar URLs firmadas). La page solo importa esta view.
 */
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/features/auth';
import { getStorage } from '@/shared/core';
import {
  getComparisonRepository,
  scopeFromSession,
  type FileKind,
} from '@/shared/core';
import { GetComparisonDetailUseCase } from '../../core/application/getComparisonDetailUseCase';
import { EstadoBadge } from '../components/EstadoBadge';
import {
  formatBytes,
  formatDate,
  formatDuration,
  formatNumber,
  formatUsd,
} from '@/shared/lib/format';

const KIND_LABEL: Record<FileKind, string> = {
  PDF_INPUT: 'PDF (entrada)',
  XLSX_INPUT: 'Excel del pedido',
  REPORT_OUTPUT: 'Informe generado',
};

export async function ComparisonDetailView({ id }: { id: string }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const useCase = new GetComparisonDetailUseCase(getComparisonRepository(), getStorage());
  const comparison = await useCase.execute(scopeFromSession(session), id);
  if (!comparison) notFound();

  const totalTokens = comparison.geminiInputTokens + comparison.geminiOutputTokens;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4">
        <Link href="/historial" className="text-sm text-blue-600 hover:text-blue-800">
          ← Volver al historial
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold text-gray-900">
          {comparison.proveedor ?? 'Comparación sin proveedor'}
          {comparison.etiqueta && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({comparison.etiqueta})
            </span>
          )}
        </h1>
        <EstadoBadge status={comparison.status} />
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 rounded-md border border-gray-200 bg-white p-4 text-sm sm:grid-cols-4">
        <Kpi label="Fecha" value={formatDate(comparison.createdAt)} />
        <Kpi label="Duración" value={formatDuration(comparison.durationMs)} />
        <Kpi label="PDFs procesados" value={String(comparison.numPdfs)} />
        <Kpi label="Discrepancias" value={String(comparison.numDiscrepancias)} />
        <Kpi label="Tokens (input)" value={formatNumber(comparison.geminiInputTokens)} />
        <Kpi
          label="Tokens (output)"
          value={formatNumber(comparison.geminiOutputTokens)}
        />
        <Kpi label="Tokens totales" value={formatNumber(totalTokens)} />
        <Kpi label="Coste estimado" value={formatUsd(comparison.geminiCostUsd)} />
      </section>

      <section className="mb-6 rounded-md border border-gray-200 bg-white p-4 text-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Contexto
        </h2>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <DescItem label="Negocio" value={comparison.business.name} />
          <DescItem
            label="Usuario"
            value={`${comparison.user.name} (${comparison.user.email})`}
          />
        </dl>
      </section>

      <section className="rounded-md border border-gray-200 bg-white">
        <h2 className="border-b border-gray-200 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Archivos ({comparison.files.length})
        </h2>
        {comparison.files.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">
            No hay archivos asociados (probablemente esta comparación falló antes de
            generar el informe).
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {comparison.files.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-900">{f.filename}</p>
                  <p className="text-xs text-gray-500">
                    {KIND_LABEL[f.kind]} · {formatBytes(f.sizeBytes)}
                  </p>
                </div>
                <a
                  href={f.downloadUrl}
                  className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Descargar
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
          Las URLs de descarga expiran a los 5 minutos. Si caducan, recarga la página.
        </p>
      </section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-0.5 font-medium text-gray-900">{value}</p>
    </div>
  );
}

function DescItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-gray-900">{value}</dd>
    </div>
  );
}
