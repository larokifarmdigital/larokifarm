import { Input } from '@/shared/components/atoms/Input';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import { STATUS_FILTERS, type StatusCounts, type StatusFilter } from './statusMeta';

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
        placeholder="Buscar por nombre o ciudad"
        aria-label="Buscar farmacia por nombre o ciudad"
        className="pl-9"
      />
    </div>
    <div className="-mx-3 sm:mx-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-control-border)] rounded-[8px] p-0.5 mx-3 sm:mx-0">
        {STATUS_FILTERS.filter(({ key }) => key === 'activas' || key === status || counts[key] > 0).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onStatusChange(key)}
            aria-pressed={status === key}
            className={cn(
              'shrink-0 px-3 h-11 sm:h-9 text-[13.5px] rounded-[6px] transition-colors whitespace-nowrap',
              status === key
                ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] font-semibold'
                : 'text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]',
            )}
          >
            {label}
            <span className="ml-1.5 text-[var(--color-muted)]">{counts[key]}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
  );
}
