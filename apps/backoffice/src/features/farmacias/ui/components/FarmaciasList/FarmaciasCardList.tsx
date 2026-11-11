import Link from 'next/link';
import type { FarmaciaSummary } from '@/core/farmacias/domain';
import { Chip } from '@/shared/components/atoms/Chip';
import { cn } from '@/shared/lib/cn';
import { formatRelativeDate } from '@/shared/lib/format';
import { FarmaciaAvatar } from './FarmaciaAvatar';
import { FarmaciaRowActions, type RowActionRunner } from './FarmaciaRowActions';
import { STATUS_META } from './statusMeta';

/** Listado móvil: cards apiladas. */
export function FarmaciasCardList({
  farmacias,
  pending,
  onAction,
}: {
  farmacias: FarmaciaSummary[];
  pending: boolean;
  onAction: RowActionRunner;
}) {
  return (
    <ul className="md:hidden space-y-2">
      {farmacias.map((f) => {
        const st = STATUS_META[f.status];
        const dimmed = f.status === 'archived';
        return (
          <li
            key={f.id}
            className={cn(
              'card p-3 flex items-center gap-3',
              dimmed && 'opacity-70',
            )}
          >
            <Link
              href={`/farmacias/${f.id}`}
              className="flex items-center gap-3 min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-[4px]"
            >
              <FarmaciaAvatar farmacia={f} size={40} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-[15px] font-medium text-[var(--color-ink)] truncate">
                    {f.nombre}
                  </span>
                  <Chip tone={st.tone}>{st.label}</Chip>
                </span>
                <span className="flex items-center gap-2 text-[12px] text-[var(--color-muted)] mt-0.5 flex-wrap">
                  <span className="font-mono-tabular truncate">/{f.slug}</span>
                  {f.ciudad && <><span aria-hidden>·</span><span>{f.ciudad}</span></>}
                  <span aria-hidden>·</span>
                  <span>{formatRelativeDate(f.updatedAt)}</span>
                </span>
              </span>
            </Link>
            <FarmaciaRowActions
              farmacia={f}
              pending={pending}
              onAction={onAction}
            />
          </li>
        );
      })}
    </ul>
  );
}
