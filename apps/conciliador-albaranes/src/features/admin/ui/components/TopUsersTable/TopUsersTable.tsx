import type { UserBucket } from '@/core/comparisons';
import { businessColor } from '@/features/history/lib/businessColor';
import { UserAvatar } from '@/shared/components/atoms/UserAvatar';
import { formatNumber, formatUsd } from '@/shared/lib/format';

interface TopUsersTableProps {
  rows: UserBucket[];
  showBusiness: boolean;
}

export function TopUsersTable({ rows, showBusiness }: TopUsersTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Top usuarios</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Actividad del mes en curso
        </p>
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
                  <th className="w-10 px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Usuario</th>
                  {showBusiness && <th className="px-3 py-2.5">Negocio</th>}
                  <th className="px-3 py-2.5 text-right">Comparaciones</th>
                  <th className="px-3 py-2.5 text-right">PDFs</th>
                  <th className="px-3 py-2.5 text-right">Coste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => {
                  const tokens =
                    r.metrics.geminiInputTokens + r.metrics.geminiOutputTokens;
                  const costTooltip = `${formatNumber(tokens)} tokens · ${formatUsd(r.metrics.geminiCostUsd)}`;
                  return (
                    <tr key={r.user.id} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2.5 text-xs font-semibold text-slate-400">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            seed={r.user.email}
                            name={r.user.name}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p
                              className="max-w-[220px] truncate font-medium text-slate-900"
                              title={r.user.name}
                            >
                              {r.user.name}
                            </p>
                            <p
                              className="max-w-[220px] truncate text-xs text-slate-500"
                              title={r.user.email}
                            >
                              {r.user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      {showBusiness && (
                        <td className="px-3 py-2.5 text-slate-700">
                          {r.business ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{
                                  background: businessColor(r.business.slug),
                                }}
                                aria-hidden
                              />
                              <span
                                className="max-w-[180px] truncate"
                                title={r.business.name}
                              >
                                {r.business.name}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                        {formatNumber(r.metrics.numComparisons)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                        {formatNumber(r.metrics.numPdfs)}
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
            </table>
          </div>

          {/* Móvil: cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {rows.map((r, i) => {
              const tokens =
                r.metrics.geminiInputTokens + r.metrics.geminiOutputTokens;
              return (
                <li key={r.user.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                      {i + 1}
                    </span>
                    <UserAvatar
                      seed={r.user.email}
                      name={r.user.name}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate font-medium text-slate-900"
                        title={r.user.name}
                      >
                        {r.user.name}
                      </p>
                      <p
                        className="mt-0.5 truncate text-xs text-slate-500"
                        title={r.user.email}
                      >
                        {r.user.email}
                      </p>
                      {showBusiness && r.business && (
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{
                              background: businessColor(r.business.slug),
                            }}
                            aria-hidden
                          />
                          {r.business.name}
                        </p>
                      )}
                    </div>
                  </div>

                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
                    <MetaCell
                      label="Comparaciones"
                      value={formatNumber(r.metrics.numComparisons)}
                    />
                    <MetaCell
                      label="PDFs"
                      value={formatNumber(r.metrics.numPdfs)}
                    />
                    <MetaCell
                      label="Coste"
                      value={formatUsd(r.metrics.geminiCostUsd)}
                      tooltip={`${formatNumber(tokens)} tokens · ${formatUsd(r.metrics.geminiCostUsd)}`}
                    />
                  </dl>
                </li>
              );
            })}
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
}: {
  label: string;
  value: string;
  tooltip?: string;
}) {
  return (
    <div title={tooltip}>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium tabular-nums text-slate-800">
        {value}
      </dd>
    </div>
  );
}
