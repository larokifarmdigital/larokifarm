import type { RecentComparison } from '../data/dashboardData';
import { Chip } from '@/components/ui/Chip';

const STATUS_LABELS = {
  OK: { label: 'OK', tone: 'green' as const },
  DISCREPANCIES: { label: 'Discrepancias', tone: 'yellow' as const },
  ERROR: { label: 'Error', tone: 'red' as const },
};

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function RecentComparisons({ items }: { items: RecentComparison[] }) {
  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[14px] text-[var(--color-muted)] m-0">
          Aún no hay conciliaciones. Al ejecutar una desde el conciliador aparecerá aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-[13.5px]">
        <thead>
          <tr className="border-b border-[var(--color-hairline)]">
            <th className="text-left font-medium text-[var(--color-muted)] py-3 px-5 text-[12px] uppercase tracking-[0.05em]">
              Fecha
            </th>
            <th className="text-left font-medium text-[var(--color-muted)] py-3 px-5 text-[12px] uppercase tracking-[0.05em]">
              Proveedor / Etiqueta
            </th>
            <th className="text-left font-medium text-[var(--color-muted)] py-3 px-5 text-[12px] uppercase tracking-[0.05em]">
              Estado
            </th>
            <th className="text-right font-medium text-[var(--color-muted)] py-3 px-5 text-[12px] uppercase tracking-[0.05em]">
              Discrep.
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => {
            const status = STATUS_LABELS[c.status];
            return (
              <tr
                key={c.id}
                className="border-t border-[var(--color-hairline)] first:border-t-0"
              >
                <td className="py-3 px-5 text-[var(--color-ink-2)] font-mono-tabular text-[12.5px]">
                  {formatDate(c.createdAt)}
                </td>
                <td className="py-3 px-5">
                  <div className="text-[var(--color-ink)] font-medium">
                    {c.supplier ?? '—'}
                  </div>
                  {c.label && (
                    <div className="text-[12px] text-[var(--color-muted)] mt-0.5 truncate max-w-[280px]">
                      {c.label}
                    </div>
                  )}
                </td>
                <td className="py-3 px-5">
                  <Chip tone={status.tone}>{status.label}</Chip>
                </td>
                <td className="py-3 px-5 text-right font-mono-tabular text-[var(--color-ink-2)]">
                  {c.numDiscrepancies}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
