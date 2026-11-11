import Link from 'next/link';
import type { FarmaciaSummary } from '@/core/farmacias/domain';
import { LOCALE_LABELS, type Locale } from '@/core/shared';
import { Chip } from '@/shared/components/atoms/Chip';
import { cn } from '@/shared/lib/cn';
import { formatRelativeDate } from '@/shared/lib/format';
import { FarmaciaAvatar } from './FarmaciaAvatar';
import { FarmaciaRowActions, type RowActionRunner } from './FarmaciaRowActions';
import { STATUS_META } from './statusMeta';

/** Listado desktop: tabla. */
export function FarmaciasTable({
  farmacias,
  pending,
  onAction,
}: {
  farmacias: FarmaciaSummary[];
  pending: boolean;
  onAction: RowActionRunner;
}) {
  return (
    <div className="hidden md:block card overflow-hidden">
    <table className="w-full text-left text-[14px]">
      <thead>
        <tr className="border-b border-[var(--color-hairline)] text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
          <th className="pl-4 pr-2 py-2.5 font-medium">Farmacia</th>
          <th className="px-2 py-2.5 font-medium">Ciudad</th>
          <th className="px-2 py-2.5 font-medium hidden lg:table-cell">Idiomas</th>
          <th className="px-2 py-2.5 font-medium">Estado</th>
          <th className="px-2 py-2.5 font-medium hidden lg:table-cell">Actualizado</th>
          <th className="pl-2 pr-4 py-2.5 font-medium text-right w-14">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {farmacias.map((f, i) => {
          const st = STATUS_META[f.status];
          const dimmed = f.status === 'archived';
          return (
            <tr
              key={f.id}
              className={cn(
                'group border-b border-[var(--color-hairline)] last:border-b-0 hover:bg-[var(--color-surface-sunken)]/60 transition-colors',
                i % 2 === 1 && 'bg-[var(--color-surface-2)]',
                dimmed && 'opacity-70',
              )}
            >
              <td className="pl-4 pr-2 py-3">
                <Link
                  href={`/farmacias/${f.id}`}
                  className="flex items-center gap-3 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-[4px]"
                >
                  <FarmaciaAvatar farmacia={f} size={36} />
                  <span className="min-w-0">
                    <span className="block truncate text-[var(--color-ink)] font-medium">
                      {f.nombre}
                    </span>
                    <span className="block truncate text-[12px] text-[var(--color-muted)] font-mono-tabular">
                      /{f.slug}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="px-2 py-3 text-[var(--color-ink-2)]">
                {f.ciudad ?? <span className="text-[var(--color-muted-2)]">—</span>}
              </td>
              <td className="px-2 py-3 hidden lg:table-cell">
                <div className="flex items-center gap-1">
                  {f.idiomasActivos.map((l) => (
                    <span
                      key={l}
                      title={LOCALE_LABELS[l as Locale]}
                      className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-2)] bg-[var(--color-surface-sunken)] rounded px-1.5 py-0.5 font-mono"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-2 py-3">
                <Chip tone={st.tone}>{st.label}</Chip>
              </td>
              <td className="px-2 py-3 text-[13px] text-[var(--color-muted)] hidden lg:table-cell">
                {formatRelativeDate(f.updatedAt)}
              </td>
              <td className="pl-2 pr-3 py-3 text-right">
                <FarmaciaRowActions
                  farmacia={f}
                  pending={pending}
                  onAction={onAction}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    </div>
  );
}
