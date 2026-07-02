import type { ComparisonStatus } from '@/core/comparisons';

const STYLES: Record<ComparisonStatus, { classes: string; label: string }> = {
  OK: {
    classes: 'bg-green-50 text-green-700 ring-green-200',
    label: 'OK',
  },
  DISCREPANCIES: {
    classes: 'bg-amber-50 text-amber-800 ring-amber-200',
    label: 'Discrepancias',
  },
  ERROR: {
    classes: 'bg-red-50 text-red-700 ring-red-200',
    label: 'Error',
  },
};

export function StatusBadge({ status }: { status: ComparisonStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.classes}`}
    >
      {s.label}
    </span>
  );
}
