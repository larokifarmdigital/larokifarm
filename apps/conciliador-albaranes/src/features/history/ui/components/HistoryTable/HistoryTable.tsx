import Link from 'next/link';
import type { ComparisonRow } from '@/core/comparisons';
import type { ReportCounts } from '@/core/reports';
import type { Role } from '@/core/shared';
import {
  formatDateOnly,
  formatNumber,
  formatUsd,
} from '@/shared/lib/format';
import { businessColor } from '../../../lib/businessColor';
import { StatusBadge } from '../StatusBadge';

/* Decide qué estado visual gana en una fila con reports:
   - OPEN ≥1  → ámbar (necesita atención, incluso si también hay RESOLVED)
   - solo RESOLVED  → verde suave (ya se solucionó, contexto informativo)
   - sin reports  → null */
type ReportHighlight = 'open' | 'resolved' | null;

function highlightFor(counts?: ReportCounts): ReportHighlight {
  if (!counts) return null;
  if (counts.open > 0) return 'open';
  if (counts.resolved > 0) return 'resolved';
  return null;
}

export function HistoryTable({
  rows,
  role,
  reportsCount = {},
}: {
  rows: ComparisonRow[];
  role: Role;
  /** Map comparisonId → {open, resolved} counts. Vacío si nadie reportó nada. */
  reportsCount?: Record<string, ReportCounts>;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </span>
        <p className="text-sm font-medium text-slate-900">
          No hay comparaciones con esos filtros
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Prueba a ampliar el rango de fechas o quitar filtros.
        </p>
      </div>
    );
  }

  const showBusiness = role === 'SUPER_ADMIN';

  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2.5">Fecha</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5">Proveedor</th>
              {showBusiness && <th className="px-3 py-2.5">Negocio</th>}
              <th className="px-3 py-2.5">Usuario</th>
              <th className="px-3 py-2.5 text-right">PDFs</th>
              <th className="px-3 py-2.5 text-right">Discrepancia</th>
              <th className="px-3 py-2.5 text-right">Coste</th>
              <th className="w-12 px-3 py-2.5" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const tokens = r.geminiInputTokens + r.geminiOutputTokens;
              const bColor = businessColor(r.business.slug);
              const costTooltip = `${formatNumber(tokens)} tokens · ${formatUsd(r.geminiCostUsd)}`;
              const counts = reportsCount[r.id];
              const highlight = highlightFor(counts);
              const rowClass =
                highlight === 'open'
                  ? 'bg-amber-50/60 hover:bg-amber-50'
                  : highlight === 'resolved'
                    ? 'bg-emerald-50/50 hover:bg-emerald-50'
                    : 'hover:bg-slate-50/70';
              return (
                <tr key={r.id} className={rowClass}>
                  <td
                    className="whitespace-nowrap py-2.5 pl-3 pr-3 text-slate-700"
                    style={{
                      boxShadow: `inset 4px 0 0 ${bColor}`,
                      paddingLeft: 12,
                    }}
                  >
                    {formatDateOnly(r.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={r.status} />
                  </td>
                  <TruncatedCell
                    text={r.supplier ?? '—'}
                    bold
                    badge={counts ? <ReportBadge counts={counts} /> : undefined}
                  />
                  {showBusiness && <TruncatedCell text={r.business.name} />}
                  <TruncatedCell
                    text={r.user.name}
                    subText={r.user.email}
                  />
                  <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">
                    {r.numPdfs}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {r.numDiscrepancies > 0 ? (
                      <span className="font-medium text-amber-700">
                        {r.numDiscrepancies}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td
                    className="px-3 py-2.5 text-right text-slate-700 tabular-nums"
                    title={costTooltip}
                  >
                    {formatUsd(r.geminiCostUsd)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <Link
                      href={`/historial/${r.id}`}
                      title="Ver detalle"
                      aria-label="Ver detalle"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                      style={{
                        color: 'var(--brand-primary)',
                      }}
                    >
                      <EyeIcon />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((r) => {
          const tokens = r.geminiInputTokens + r.geminiOutputTokens;
          const bColor = businessColor(r.business.slug);
          const costTooltip = `${formatNumber(tokens)} tokens · ${formatUsd(r.geminiCostUsd)}`;
          const counts = reportsCount[r.id];
          const highlight = highlightFor(counts);
          const cardBg =
            highlight === 'open'
              ? 'bg-amber-50/60 border-amber-200'
              : highlight === 'resolved'
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-white border-slate-200';
          return (
            <li
              key={r.id}
              className={`overflow-hidden rounded-2xl border p-4 ${cardBg}`}
              style={{ borderLeft: `4px solid ${bColor}` }}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className="truncate font-semibold text-slate-900"
                      title={r.supplier ?? undefined}
                    >
                      {r.supplier ?? 'Proveedor desconocido'}
                    </p>
                    {counts ? <ReportBadge counts={counts} /> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDateOnly(r.createdAt)}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>

              {showBusiness && (
                <p
                  className="mb-1 truncate text-xs text-slate-500"
                  title={r.business.name}
                >
                  {r.business.name}
                </p>
              )}
              <p
                className="mb-3 truncate text-xs text-slate-500"
                title={r.user.email}
              >
                {r.user.name}
              </p>

              <dl className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
                <MetaCell label="PDFs" value={String(r.numPdfs)} />
                <MetaCell
                  label="Discrepancia"
                  value={String(r.numDiscrepancies)}
                  highlight={r.numDiscrepancies > 0}
                />
                <MetaCell
                  label="Coste"
                  value={formatUsd(r.geminiCostUsd)}
                  tooltip={costTooltip}
                />
              </dl>

              <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                <Link
                  href={`/historial/${r.id}`}
                  title="Ver detalle"
                  aria-label="Ver detalle"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  <EyeIcon />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TruncatedCell({
  text,
  subText,
  bold = false,
  badge,
}: {
  text: string;
  subText?: string;
  bold?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <td className="max-w-[220px] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span
          className={`block truncate ${bold ? 'font-medium text-slate-900' : 'text-slate-700'}`}
          title={subText ?? text}
        >
          {text}
        </span>
        {badge}
      </div>
    </td>
  );
}

function ReportBadge({ counts }: { counts: ReportCounts }) {
  /* Pintamos DOS chips distintos si hay tanto abiertos como resueltos, para que el
     usuario vea de un vistazo que aún queda algo pendiente aunque el resto se cerró. */
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {counts.open > 0 && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-300"
          title={`${counts.open} ${counts.open === 1 ? 'reporte abierto' : 'reportes abiertos'}`}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" x2="4" y1="22" y2="15" />
          </svg>
          {counts.open}
        </span>
      )}
      {counts.resolved > 0 && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-300"
          title={`${counts.resolved} ${counts.resolved === 1 ? 'reporte solucionado' : 'reportes solucionados'}`}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {counts.resolved}
        </span>
      )}
    </span>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function MetaCell({
  label,
  value,
  highlight = false,
  tooltip,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tooltip?: string;
}) {
  return (
    <div title={tooltip}>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd
        className={`mt-0.5 font-medium tabular-nums ${
          highlight ? 'text-amber-700' : 'text-slate-800'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
