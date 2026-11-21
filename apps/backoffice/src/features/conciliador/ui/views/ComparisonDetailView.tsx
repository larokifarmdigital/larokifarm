import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReconciledLine } from '@/core/engine';
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
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import {
  formatDuration,
  formatNumber,
  formatUsd,
} from '@/shared/lib/format';
import { HistoryResultCard } from '../components/HistoryResultCard';
import { fechaHoraMadrid } from '../lib/historial';
import type { ReportView } from '../components/ReportsSection';
import type { PreviewFile } from '../components/FilePreviewModal';

// NOTE: conciliaciones antiguas no traen líneas en summary → undefined → se remite al informe.
function extractLines(summary: unknown): ReconciledLine[] | undefined {
  if (!summary || typeof summary !== 'object') return undefined;
  const lines = (summary as { lines?: unknown }).lines;
  if (!Array.isArray(lines)) return undefined;
  return lines as ReconciledLine[];
}

// Extracción cruda de Gemini por PDF (solo SUPER_ADMIN, dentro de "Datos
// técnicos"). Las conciliaciones antiguas no la guardaron → undefined.
interface RawExtractionEntry {
  filename: string;
  data: {
    deliveryNoteNumber?: string;
    supplier?: string;
    date?: string;
    orderNumber?: string;
    documentKind?: string;
    lines: Array<{
      code?: string;
      nationalCode?: string;
      ean?: string;
      description?: string;
      quantity?: number;
      unitPrice?: number;
      discount?: number;
      freeUnits?: number;
    }>;
  };
  usage?: { promptTokens?: number; candidatesTokens?: number };
}
function extractRawExtractions(summary: unknown): RawExtractionEntry[] | undefined {
  if (!summary || typeof summary !== 'object') return undefined;
  const raw = (summary as { rawExtractions?: unknown }).rawExtractions;
  if (!Array.isArray(raw)) return undefined;
  return raw as RawExtractionEntry[];
}

function extractError(summary: unknown): string | undefined {
  if (!summary || typeof summary !== 'object') return undefined;
  const e = (summary as { error?: unknown }).error;
  return typeof e === 'string' ? e : undefined;
}

function previewKind(kind: FileKind, filename: string): PreviewFile['kind'] | null {
  if (kind === 'PDF_INPUT' || /\.pdf$/i.test(filename)) return 'pdf';
  if (kind === 'XLSX_INPUT' || kind === 'REPORT_OUTPUT' || /\.(xlsx?|xlsm)$/i.test(filename)) return 'excel';
  return null;
}

// Orden en "Ver archivos": lo que subió el usuario primero, el informe al final.
const ORDEN_ARCHIVO: Record<FileKind, number> = { PDF_INPUT: 0, XLSX_INPUT: 1, REPORT_OUTPUT: 2 };

export async function ComparisonDetailView({ id }: { id: string }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const scope = scopeFromSession(session);
  const esSuperAdmin = session.user.role === 'SUPER_ADMIN';
  const comparison = await new GetComparisonDetailUseCase(
    getComparisonRepository(),
    getStorage(),
  ).execute(scope, id);
  if (!comparison) notFound();

  const reports = await new ListReportsByComparisonUseCase(
    getReportRepository(),
    getComparisonRepository(),
  ).execute({ scope, comparisonId: id });

  // Al cliente solo viaja lo que se pinta: sin emails, coste ni tokens.
  const reportsForClient: ReportView[] = reports.map((r) => ({
    id: r.id,
    note: r.note,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    author: { id: r.author.id, name: r.author.name },
    resolvedNote: r.resolvedNote,
    resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    resolvedBy: r.resolvedBy ? { id: r.resolvedBy.id, name: r.resolvedBy.name } : null,
  }));

  const lineas = extractLines(comparison.summary) ?? null;
  const errorTecnico = extractError(comparison.summary);
  const informe = comparison.files.find((f) => f.kind === 'REPORT_OUTPUT');
  const archivos: PreviewFile[] = [...comparison.files]
    .sort((a, b) => ORDEN_ARCHIVO[a.kind] - ORDEN_ARCHIVO[b.kind])
    .flatMap((f) => {
      const kind = previewKind(f.kind, f.filename);
      return kind ? [{ name: f.filename, src: f.downloadUrl, kind }] : [];
    });

  // Mismo título que en Inicio y en la lista del historial: el proveedor; el
  // nombre del envío (nº de albarán) va en la línea secundaria.
  const titulo = comparison.supplier || comparison.label || 'Conciliación sin proveedor';
  const meta = [
    comparison.label && comparison.label !== titulo ? comparison.label : null,
    fechaHoraMadrid(comparison.createdAt),
    comparison.user.name,
    esSuperAdmin ? comparison.business.name : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const rawExtractions = esSuperAdmin ? extractRawExtractions(comparison.summary) : undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-10 sm:px-6 sm:pt-6">
      <Link
        href="/albaranes/historial"
        className="mb-3 inline-flex min-h-11 items-center gap-1.5 rounded-[8px] px-2 -ml-2 text-[14.5px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
      >
        <NavIcon name="ArrowLeft" size={16} />
        Historial
      </Link>

      <HistoryResultCard
        comparisonId={id}
        titulo={titulo}
        meta={meta}
        estado={comparison.status}
        numDiscrepancias={comparison.numDiscrepancies}
        lineas={lineas}
        mensajeError={
          comparison.status === 'ERROR'
            ? 'No se pudo leer el albarán. Prueba a subirlo de nuevo y, si vuelve a pasar, repórtalo.'
            : null
        }
        informeUrl={informe?.downloadUrl ?? null}
        archivos={archivos}
        initialReports={reportsForClient}
        currentUser={{ id: session.user.id, role: session.user.role }}
      />

      {esSuperAdmin && (
        <details className="card mt-4 sm:mt-5 p-0 overflow-hidden">
          <summary className="flex min-h-12 cursor-pointer select-none items-center px-4 sm:px-6 text-[15px] font-semibold text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:-outline-offset-2">
            Datos técnicos
            <span className="ml-2 text-[13px] font-normal text-[var(--color-muted)]">solo administradores</span>
          </summary>
          <div className="border-t border-[var(--color-hairline)] px-4 py-4 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2 lg:grid-cols-3">
              <Dato label="Farmacia" value={comparison.business.name} />
              <Dato label="Usuario" value={`${comparison.user.name} · ${comparison.user.email}`} />
              <Dato label="Duración" value={formatDuration(comparison.durationMs)} />
              <Dato label="PDFs" value={String(comparison.numPdfs)} />
              <Dato
                label="Tokens Gemini (entrada / salida)"
                value={`${formatNumber(comparison.geminiInputTokens)} / ${formatNumber(comparison.geminiOutputTokens)}`}
              />
              <Dato label="Coste estimado" value={formatUsd(comparison.geminiCostUsd)} />
            </dl>
            {errorTecnico && (
              <p className="m-0 mt-4 break-words rounded-[8px] bg-[var(--color-surface-2)] px-3 py-2.5 font-mono text-[13px] text-[var(--color-ink)]">
                {errorTecnico}
              </p>
            )}
            {rawExtractions && rawExtractions.length > 0 && (
              <DebugRawExtractionsPanel entries={rawExtractions} />
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function Dato({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] text-[var(--color-muted)]">{label}</dt>
      <dd className="m-0 mt-0.5 break-words font-mono-tabular text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}

function DebugRawExtractionsPanel({ entries }: { entries: RawExtractionEntry[] }) {
  return (
    <section className="mt-5" aria-labelledby="debug-ia">
      <h2 id="debug-ia" className="m-0 text-[15px] font-semibold text-[var(--color-ink)]">
        Lo que leyó la IA en cada PDF
      </h2>
      <p className="m-0 mt-1 mb-3 text-[13.5px] text-[var(--color-muted)]">
        Tal cual, antes de unir PDFs y conciliar. Sirve para diagnosticar descuentos perdidos, códigos mal leídos o líneas duplicadas.
      </p>
      {entries.map((entry, i) => (
        <details key={i} className="mb-2 overflow-hidden rounded-[10px] border border-[var(--color-hairline)]" open={i === 0}>
          <summary className="flex min-h-11 cursor-pointer select-none flex-wrap items-center gap-x-2 px-3 py-2 text-[14px] font-medium text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:-outline-offset-2">
            <span className="font-mono-tabular text-[var(--color-muted)]">#{i + 1}</span>
            <span className="break-all">{entry.filename}</span>
            {entry.data.documentKind && <span className="chip chip-neutral">{entry.data.documentKind}</span>}
            <span className="text-[13px] text-[var(--color-muted)]">· {entry.data.lines?.length ?? 0} líneas</span>
          </summary>

          <div className="border-t border-[var(--color-hairline)] px-3 py-3 text-[13px]">
            <dl className="mb-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {entry.data.deliveryNoteNumber && <Dato label="Nº albarán/factura" value={entry.data.deliveryNoteNumber} />}
              {entry.data.supplier && <Dato label="Proveedor" value={entry.data.supplier} />}
              {entry.data.date && <Dato label="Fecha" value={entry.data.date} />}
              {entry.data.orderNumber && <Dato label="Nº pedido" value={entry.data.orderNumber} />}
              {entry.usage && (
                <Dato
                  label="Tokens (entrada / salida)"
                  value={`${entry.usage.promptTokens ?? '?'} / ${entry.usage.candidatesTokens ?? '?'}`}
                />
              )}
            </dl>

            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`Líneas leídas de ${entry.filename}`}>
              <table className="w-full min-w-[720px] border-collapse text-left font-mono-tabular text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[var(--color-ink-2)]">
                    <th scope="col" className="px-2 py-1 text-right">#</th>
                    <th scope="col" className="px-2 py-1">Código</th>
                    <th scope="col" className="px-2 py-1">CN</th>
                    <th scope="col" className="px-2 py-1">EAN</th>
                    <th scope="col" className="px-2 py-1">Descripción</th>
                    <th scope="col" className="px-2 py-1 text-right">Uds.</th>
                    <th scope="col" className="px-2 py-1 text-right">Precio</th>
                    <th scope="col" className="px-2 py-1 text-right">Dto. %</th>
                    <th scope="col" className="px-2 py-1 text-right">Regalo</th>
                  </tr>
                </thead>
                <tbody>
                  {(entry.data.lines ?? []).map((l, idx) => (
                    <tr key={idx} className="border-b border-[var(--color-hairline)] last:border-0 text-[var(--color-ink)]">
                      <td className="px-2 py-1 text-right text-[var(--color-muted)]">{idx + 1}</td>
                      <td className="px-2 py-1">{l.code ?? '—'}</td>
                      <td className="px-2 py-1">{l.nationalCode ?? '—'}</td>
                      <td className="px-2 py-1">{l.ean ?? '—'}</td>
                      <td className="px-2 py-1 max-w-[280px] truncate" title={l.description}>{l.description ?? '—'}</td>
                      <td className="px-2 py-1 text-right">{l.quantity ?? 0}</td>
                      <td className="px-2 py-1 text-right">{l.unitPrice != null ? l.unitPrice.toFixed(4) : '—'}</td>
                      <td className="px-2 py-1 text-right">{l.discount != null ? l.discount : '—'}</td>
                      <td className="px-2 py-1 text-right">{l.freeUnits ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      ))}
    </section>
  );
}
