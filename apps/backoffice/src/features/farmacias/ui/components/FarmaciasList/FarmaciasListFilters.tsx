import { Input } from '@/shared/components/atoms/Input';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import type { FarmaciaStatus } from '@/core/farmacias/domain';
import { STATUS_FILTERS, STATUS_META, type StatusCounts, type StatusFilter } from './statusMeta';

export function FarmaciasListFilters({
  query,
  onQueryChange,
  status,
  onStatusChange,
  counts,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  status: StatusFilter;
  onStatusChange: (s: StatusFilter) => void;
  counts: StatusCounts;
}) {
  return (
  <div className="flex flex-col gap-2.5 mb-4 sm:mb-5 sm:flex-row sm:items-center sm:gap-3">
    <div className="relative flex-1 sm:max-w-md">
      <NavIcon
        name="MagnifyingGlass"
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none"
      />
      <Input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Buscar por nombre, slug o ciudad…"
        aria-label="Buscar farmacia"
        className="pl-9"
      />
    </div>
    <div className="-mx-3 sm:mx-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[6px] p-0.5 mx-3 sm:mx-0">
        {STATUS_FILTERS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onStatusChange(k)}
            aria-pressed={status === k}
            className={cn(
              'shrink-0 px-3 h-8 text-[12.5px] rounded-[4px] transition-colors whitespace-nowrap',
              status === k
                ? 'bg-[var(--color-surface-sunken)] text-[var(--color-ink)] font-medium'
                : 'text-[var(--color-muted)] hover:text-[var(--color-ink-2)]',
            )}
          >
            {k === 'todos' ? 'Todas' : STATUS_META[k as FarmaciaStatus].label}
            <span className="ml-1.5 text-[var(--color-muted-2)]">
              {counts[k]}
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
  );
}
