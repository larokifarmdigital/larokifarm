import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/core/auth';
import { scopeFromSession } from '@/core/shared';
import {
  GetComparisonDetailUseCase,
  getComparisonRepository,
  type FileKind,
} from '@/core/comparisons';
import { getStorage } from '@/core/storage';
import {
  ListReportsByComparisonUseCase,
  getReportRepository,
} from '@/core/reports';
import type { ReconciledLine } from '@/core/engine';
import { StatusBadge } from '../components/StatusBadge';
import { ComparisonFiles } from '../components/ComparisonFiles';
import { ReportsSection, type ReportView } from '../components/ReportsSection';
import {
  formatDate,
  formatDuration,
  formatNumber,
  formatUsd,
} from '@/shared/lib/format';

// NOTE: comparaciones antiguas no traen líneas en summary → undefined → la vista cae al preview XLSX.
function extractLines(summary: unknown): ReconciledLine[] | undefined {
  if (!summary || typeof summary !== 'object') return undefined;
  const lines = (summary as { lines?: unknown }).lines;
  if (!Array.isArray(lines)) return undefined;
  return lines as ReconciledLine[];
}

const KIND_LABEL: Record<FileKind, string> = {
  PDF_INPUT: 'PDF (entrada)',
  XLSX_INPUT: 'Excel del pedido',
  REPORT_OUTPUT: 'Informe generado',
};

function fileKindFor(
  kind: FileKind,
  filename: string,
): 'pdf' | 'excel' | 'other' {
  if (kind === 'PDF_INPUT') return 'pdf';
  if (kind === 'XLSX_INPUT' || kind === 'REPORT_OUTPUT') return 'excel';
  if (/\.pdf$/i.test(filename)) return 'pdf';
  if (/\.(xlsx?|xlsm)$/i.test(filename)) return 'excel';
  return 'other';
}

export async function ComparisonDetailView({ id }: { id: string }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const scope = scopeFromSession(session);
  const useCase = new GetComparisonDetailUseCase(
    getComparisonRepository(),
    getStorage(),
  );
  const comparison = await useCase.execute(scope, id);
  if (!comparison) notFound();

  const totalTokens =
    comparison.geminiInputTokens + comparison.geminiOutputTokens;
  const reconciliationLines = extractLines(comparison.summary);

  const reports = await new ListReportsByComparisonUseCase(
    getReportRepository(),
    getComparisonRepository(),
  ).execute({ scope, comparisonId: id });

  const reportsForClient: ReportView[] = reports.map((r) => ({
    id: r.id,
    note: r.note,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    author: r.author,
    resolvedNote: r.resolvedNote,
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    resolvedBy: r.resolvedBy,
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-4">
        <Link
          href="/historial"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeftIcon />
          Volver al historial
        </Link>
      </div>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">
            {comparison.supplier ?? 'Comparación sin proveedor'}
          </h1>
          <StatusBadge status={comparison.status} />
        </div>
        {comparison.label && (
          <p className="mt-1 text-sm text-slate-500">
            Etiqueta:{' '}
            <span className="font-medium text-slate-700">
              {comparison.label}
            </span>
          </p>
        )}
      </header>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi
          label="Fecha"
          value={formatDate(comparison.createdAt)}
          icon={<CalendarIcon />}
        />
        <Kpi
          label="Duración"
          value={formatDuration(comparison.durationMs)}
          icon={<ClockIcon />}
        />
        <Kpi
          label="PDFs"
          value={String(comparison.numPdfs)}
          icon={<DocumentIcon />}
        />
        <Kpi
          label="Discrepancias"
          value={String(comparison.numDiscrepancies)}
          icon={<AlertIcon />}
          highlight={comparison.numDiscrepancies > 0}
        />
      </section>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Contexto y consumo
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <DescItem label="Negocio" value={comparison.business.name} />
          <DescItem label="Usuario" value={comparison.user.name} />
          <DescItem label="Email" value={comparison.user.email} mono />
          <DescItem
            label="Tokens (input)"
            value={formatNumber(comparison.geminiInputTokens)}
            mono
          />
          <DescItem
            label="Tokens (output)"
            value={formatNumber(comparison.geminiOutputTokens)}
            mono
          />
          <DescItem
            label="Coste estimado"
            value={formatUsd(comparison.geminiCostUsd)}
            mono
          />
        </dl>
        <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          Total de tokens Gemini:{' '}
          <span className="font-medium text-slate-700">
            {formatNumber(totalTokens)}
          </span>
        </p>
      </section>

      <ComparisonFiles
        files={comparison.files.map((f) => ({
          id: f.id,
          filename: f.filename,
          kindLabel: KIND_LABEL[f.kind],
          kind: fileKindFor(f.kind, f.filename),
          sizeBytes: f.sizeBytes,
          downloadUrl: f.downloadUrl,
          isReport: f.kind === 'REPORT_OUTPUT',
        }))}
        reconciliationLines={reconciliationLines}
      />

      <ReportsSection
        comparisonId={id}
        initialReports={reportsForClient}
        currentUser={{ id: session.user.id, role: session.user.role }}
      />
    </main>
  );
}

function Kpi({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{
            background: highlight
              ? '#fef3c7'
              : 'var(--brand-primary-soft)',
            color: highlight ? '#b45309' : 'var(--brand-primary)',
          }}
          aria-hidden
        >
          {icon}
        </span>
        {label}
      </div>
      <p
        className={`mt-2 text-xl font-semibold tabular-nums ${
          highlight ? 'text-amber-700' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DescItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-sm text-slate-900 ${
          mono ? 'font-mono tabular-nums' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m10.29 3.86-8.4 14.5A2 2 0 0 0 3.62 21h16.76a2 2 0 0 0 1.73-2.64l-8.4-14.5a2 2 0 0 0-3.46 0Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </svg>
  );
}
