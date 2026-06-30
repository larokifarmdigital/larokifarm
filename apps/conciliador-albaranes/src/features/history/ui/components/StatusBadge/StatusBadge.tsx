import type { ComparisonStatus } from '@/core/comparisons';

const STYLES: Record<ComparisonStatus, { bg: string; text: string; label: string }> = {
  OK: { bg: 'bg-green-100', text: 'text-green-800', label: 'OK' },
  DISCREPANCIES: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Discrepancias' },
  ERROR: { bg: 'bg-red-100', text: 'text-red-800', label: 'Error' },
};

export function StatusBadge({ status }: { status: ComparisonStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full ${s.bg} ${s.text} px-2 py-0.5 text-xs font-medium`}
    >
      {s.label}
    </span>
  );
}
