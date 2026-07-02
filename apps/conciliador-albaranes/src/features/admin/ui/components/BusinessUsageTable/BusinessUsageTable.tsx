import type { BusinessBucket } from '@/core/comparisons';
import { businessColor } from '@/features/history/lib/businessColor';
import { formatNumber, formatUsd } from '@/shared/lib/format';

export function BusinessUsageTable({ rows }: { rows: BusinessBucket[] }) {
  const totals = rows.reduce(
    (acc, r) => {
      acc.comparisons += r.metrics.numComparisons;
      acc.pdfs += r.metrics.numPdfs;
      acc.discrepancies += r.metrics.numDiscrepancyItems;
      acc.tokens +=
        r.metrics.geminiInputTokens + r.metrics.geminiOutputTokens;
      acc.cost += Number(r.metrics.geminiCostUsd);
      return acc;
    },
    { comparisons: 0, pdfs: 0, discrepancies: 0, tokens: 0, cost: 0 },
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Desglose por negocio
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">Mes en curso</p>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          Sin actividad este mes.
        </p>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Negocio</th>
                  <th className="px-3 py-2.5 text-right">Comparaciones</th>
                  <th className="px-3 py-2.5 text-right">PDFs</th>
                  <th className="px-3 py-2.5 text-right">Discrep.</th>
                  <th className="px-3 py-2.5 text-right">Coste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const bColor = businessColor(r.business.slug);
                  const tokens =
                    r.metrics.geminiInputTokens + r.metrics.geminiOutputTokens;
                  const costTooltip = `${formatNumber(tokens)} tokens · ${formatUsd(r.metrics.geminiCostUsd)}`;
                  return (
                    <tr key={r.business.id} className="hover:bg-slate-50/70">
                      <td
                        className="whitespace-nowrap py-2.5 pl-3 pr-3"
                        style={{ boxShadow: `inset 4px 0 0 ${bColor}` }}
                      >
                        <p
                          className="max-w-[220px] truncate font-medium text-slate-900"
                          title={r.business.name}
                        >
                          {r.business.name}
                        </p>
                        <p
                          className="mt-0.5 truncate font-mono text-[10px] text-slate-400"
                          title={r.business.slug}
                        >
                          {r.business.slug}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                        {formatNumber(r.metrics.numComparisons)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                        {formatNumber(r.metrics.numPdfs)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {r.metrics.numDiscrepancyItems > 0 ? (
                          <span className="font-medium text-amber-700">
                            {formatNumber(r.metrics.numDiscrepancyItems)}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td
                        className="px-3 py-2.5 text-right tabular-nums text-slate-700"
                        title={costTooltip}
                      >
                        {formatUsd(r.metrics.geminiCostUsd)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <td className="px-3 py-2.5">Total</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatNumber(totals.comparisons)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatNumber(totals.pdfs)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatNumber(totals.discrepancies)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatUsd(totals.cost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Móvil: cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {rows.map((r) => {
              const bColor = businessColor(r.business.slug);
              const tokens =
                r.metrics.geminiInputTokens + r.metrics.geminiOutputTokens;
              return (
                <li
                  key={r.business.id}
                  className="px-4 py-3"
                  style={{ boxShadow: `inset 4px 0 0 ${bColor}` }}
                >
                  <div className="pl-2">
                    <p
                      className="truncate font-medium text-slate-900"
                      title={r.business.name}
                    >
                      {r.business.name}
                    </p>
                    <p
                      className="mt-0.5 truncate font-mono text-[10px] text-slate-400"
                      title={r.business.slug}
                    >
                      {r.business.slug}
                    </p>
                    <dl className="mt-3 grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-xs">
                      <MetaCell
                        label="Comp."
                        value={formatNumber(r.metrics.numComparisons)}
                      />
                      <MetaCell
                        label="PDFs"
                        value={formatNumber(r.metrics.numPdfs)}
                      />
                      <MetaCell
                        label="Discr."
                        value={formatNumber(r.metrics.numDiscrepancyItems)}
                        highlight={r.metrics.numDiscrepancyItems > 0}
                      />
                      <MetaCell
                        label="Coste"
                        value={formatUsd(r.metrics.geminiCostUsd)}
                        tooltip={`${formatNumber(tokens)} tokens · ${formatUsd(r.metrics.geminiCostUsd)}`}
                      />
                    </dl>
                  </div>
                </li>
              );
            })}
            <li className="bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <div className="mb-2">Total</div>
              <dl className="grid grid-cols-4 gap-2 text-xs">
                <MetaCell
                  label="Comp."
                  value={formatNumber(totals.comparisons)}
                />
                <MetaCell label="PDFs" value={formatNumber(totals.pdfs)} />
                <MetaCell
                  label="Discr."
                  value={formatNumber(totals.discrepancies)}
                />
                <MetaCell label="Coste" value={formatUsd(totals.cost)} />
              </dl>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}

function MetaCell({
  label,
  value,
  tooltip,
  highlight = false,
}: {
  label: string;
  value: string;
  tooltip?: string;
  highlight?: boolean;
}) {
  return (
    <div title={tooltip}>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd
        className={`mt-0.5 font-medium tabular-nums ${highlight ? 'text-amber-700' : 'text-slate-800'}`}
      >
        {value}
      </dd>
    </div>
  );
}
