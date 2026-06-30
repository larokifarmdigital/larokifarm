import type { BusinessBucket } from '@/core/comparisons';
import { formatNumber, formatUsd } from '@/shared/lib/format';

export function BusinessUsageTable({ rows }: { rows: BusinessBucket[] }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <h2 className="border-b border-gray-200 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
        Desglose por negocio — mes en curso
      </h2>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-500">Sin actividad este mes.</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2">Negocio</th>
              <th className="px-3 py-2 text-right">Comparaciones</th>
              <th className="px-3 py-2 text-right">PDFs</th>
              <th className="px-3 py-2 text-right">Discrep.</th>
              <th className="px-3 py-2 text-right">Tokens</th>
              <th className="px-3 py-2 text-right">Coste</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => {
              const tokens = r.metrics.geminiInputTokens + r.metrics.geminiOutputTokens;
              return (
                <tr key={r.business.id}>
                  <td className="px-3 py-2">
                    <div className="text-gray-900">{r.business.name}</div>
                    <div className="font-mono text-xs text-gray-500">{r.business.slug}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{formatNumber(r.metrics.numComparisons)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(r.metrics.numPdfs)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(r.metrics.numDiscrepancyItems)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(tokens)}</td>
                  <td className="px-3 py-2 text-right">{formatUsd(r.metrics.geminiCostUsd)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
