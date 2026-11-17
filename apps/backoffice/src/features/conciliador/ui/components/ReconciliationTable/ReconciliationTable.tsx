import { statusText, type ReconciledLine } from '@/core/engine';

const TH_BASE = 'px-3 py-2.5 font-semibold whitespace-nowrap';

function cell(v: number | null): string {
  return v === null ? '—' : String(v);
}

export function ReconciliationTable({ lines }: { lines: ReconciledLine[] }) {
  const mark = (l: ReconciledLine, field: 'units' | 'price' | 'discount') =>
    l.discrepancies.includes(field) ? 'bg-red-200 font-bold text-red-800' : '';

  if (lines.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-500">
        No hay líneas para mostrar.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="bg-slate-800 text-left text-xs uppercase tracking-wide text-white">
            <th className={TH_BASE}>Código</th>
            <th className={TH_BASE}>Descripción</th>
            <th className={`${TH_BASE} text-right`}>Uds ped.</th>
            <th className={`${TH_BASE} text-right`}>Uds alb.</th>
            <th className={`${TH_BASE} text-right`}>Bonif.</th>
            <th className={`${TH_BASE} text-right`}>Precio ped.</th>
            <th className={`${TH_BASE} text-right`}>Precio alb.</th>
            <th className={`${TH_BASE} text-right`}>Dto ped.</th>
            <th className={`${TH_BASE} text-right`}>Dto alb.</th>
            <th className={TH_BASE}>Estado / motivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lines.map((l, i) => {
            const badRow = l.status !== 'OK';
            return (
              <tr
                key={`${l.nationalCode}-${i}`}
                className={
                  badRow ? 'bg-red-50' : 'odd:bg-white even:bg-slate-50/60'
                }
              >
                <td className="px-3 py-2 font-medium">{l.nationalCode}</td>
                <td className="px-3 py-2">{l.description}</td>
                <td className={`px-3 py-2 text-right ${mark(l, 'units')}`}>
                  {cell(l.unitsOrdered)}
                </td>
                <td className={`px-3 py-2 text-right ${mark(l, 'units')}`}>
                  {cell(l.unitsDelivered)}
                </td>
                <td className="px-3 py-2 text-right text-emerald-700">
                  {l.freeUnitsDelivered ? `+${l.freeUnitsDelivered}` : '—'}
                </td>
                <td className={`px-3 py-2 text-right ${mark(l, 'price')}`}>
                  {cell(l.priceOrdered)}
                </td>
                <td className={`px-3 py-2 text-right ${mark(l, 'price')}`}>
                  {cell(l.priceDelivered)}
                </td>
                <td className={`px-3 py-2 text-right ${mark(l, 'discount')}`}>
                  {cell(l.discountOrdered)}
                </td>
                <td className={`px-3 py-2 text-right ${mark(l, 'discount')}`}>
                  {cell(l.discountDelivered)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      l.status === 'OK'
                        ? 'bg-green-100 text-green-700'
                        : l.status === 'DISCREPANCY'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {statusText(l)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
