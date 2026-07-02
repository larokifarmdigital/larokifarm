import type { ReactNode } from 'react';
import type { UsageMetrics } from '@/core/comparisons';
import { formatNumber, formatUsd, formatDuration } from '@/shared/lib/format';

interface KpiItem {
  key: string;
  label: string;
  value: (m: UsageMetrics) => string;
  hint?: string;
  icon: ReactNode;
}

const ITEMS: readonly KpiItem[] = [
  {
    key: 'comparisons',
    label: 'Comparaciones',
    value: (m) => formatNumber(m.numComparisons),
    hint: 'lotes procesados este mes',
    icon: <StackIcon />,
  },
  {
    key: 'pdfs',
    label: 'PDFs procesados',
    value: (m) => formatNumber(m.numPdfs),
    icon: <FileIcon />,
  },
  {
    key: 'discrepancies',
    label: 'Discrepancias',
    value: (m) => formatNumber(m.numDiscrepancyItems),
    hint: 'líneas con diferencias',
    icon: <AlertIcon />,
  },
  {
    key: 'tokens',
    label: 'Tokens Gemini',
    value: (m) => formatNumber(m.geminiInputTokens + m.geminiOutputTokens),
    hint: 'input + output',
    icon: <ChipIcon />,
  },
  {
    key: 'cost',
    label: 'Coste estimado',
    value: (m) => formatUsd(m.geminiCostUsd),
    hint: 'según precios actuales',
    icon: <DollarIcon />,
  },
  {
    key: 'duration',
    label: 'Tiempo total',
    value: (m) => formatDuration(m.durationMsTotal),
    hint: 'procesamiento server-side',
    icon: <ClockIcon />,
  },
];

export function KpiCards({ metrics }: { metrics: UsageMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {ITEMS.map((it) => {
        const isDiscrepancy = it.key === 'discrepancies';
        const highlight = isDiscrepancy && metrics.numDiscrepancyItems > 0;
        return (
          <div
            key={it.key}
            className="rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{
                  background: highlight
                    ? '#fef3c7' /* amber-100 */
                    : 'var(--brand-primary-soft)',
                  color: highlight
                    ? '#b45309' /* amber-700 */
                    : 'var(--brand-primary)',
                }}
                aria-hidden
              >
                {it.icon}
              </span>
              {it.label}
            </div>
            <p
              className={`mt-2 truncate text-xl font-semibold tabular-nums ${
                highlight ? 'text-amber-700' : 'text-slate-900'
              }`}
            >
              {it.value(metrics)}
            </p>
            {it.hint && (
              <p className="mt-0.5 text-[11px] text-slate-400">{it.hint}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------- Icons -------------------------------- */

function StackIcon() {
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
      <path d="m12 3-9 5 9 5 9-5-9-5Z" />
      <path d="m3 13 9 5 9-5" />
      <path d="m3 18 9 5 9-5" />
    </svg>
  );
}

function FileIcon() {
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

function ChipIcon() {
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
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2" />
    </svg>
  );
}

function DollarIcon() {
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
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
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
