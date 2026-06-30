import Link from 'next/link';
import type { ComparisonRow } from '@/core/comparisons';
import type { Role } from '@/core/shared';
import { formatDate, formatNumber, formatUsd } from '@/shared/lib/format';
import { StatusBadge } from '../StatusBadge';

export function HistoryTable({ rows, role }: { rows: ComparisonRow[]; role: Role }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        No hay comparaciones con esos filtros.
      </div>
    );
  }

  const showBusiness = role === 'SUPER_ADMIN';
  const showUser = role !== 'USER';

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-3 py-2">Fecha</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Proveedor</th>
            {showBusiness && <th className="px-3 py-2">Negocio</th>}
            {showUser && <th className="px-3 py-2">Usuario</th>}
            <th className="px-3 py-2 text-right">PDFs</th>
            <th className="px-3 py-2 text-right">Discrep.</th>
            <th className="px-3 py-2 text-right">Tokens</th>
            <th className="px-3 py-2 text-right">Coste</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => {
            const tokens = r.geminiInputTokens + r.geminiOutputTokens;
            return (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                  {formatDate(r.createdAt)}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-3 py-2 text-gray-900">
                  {r.supplier ?? <span className="text-gray-400">—</span>}
                </td>
                {showBusiness && (
                  <td className="px-3 py-2 text-gray-700">{r.business.name}</td>
                )}
                {showUser && (
                  <td className="px-3 py-2 text-gray-700" title={r.user.email}>
                    {r.user.name}
                  </td>
                )}
                <td className="px-3 py-2 text-right text-gray-700">{r.numPdfs}</td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {r.numDiscrepancies}
                </td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {formatNumber(tokens)}
                </td>
                <td className="px-3 py-2 text-right text-gray-700">
                  {formatUsd(r.geminiCostUsd)}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/historial/${r.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    Ver →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
