import Link from 'next/link';
import type { FarmaciaSummary } from '@/core/farmacias/domain';
import { Chip } from '@/shared/components/atoms/Chip';
import { cn } from '@/shared/lib/cn';
import { formatRelativeDate } from '@/shared/lib/format';
import { FarmaciaAvatar } from './FarmaciaAvatar';
import { FarmaciaRowActions, type RowActionRunner } from './FarmaciaRowActions';
import { estadoFila } from './statusMeta';

/** Listado móvil: cards apiladas. */
export function FarmaciasCardList({
  farmacias,
  pending,
  onAction,
  canDuplicate,
  canWrite,
}: {
  farmacias: FarmaciaSummary[];
  pending: boolean;
  onAction: RowActionRunner;
  canDuplicate: boolean;
  canWrite: boolean;
}) {
  return (
    <ul className="md:hidden space-y-2">
      {farmacias.map((f) => {
        const st = estadoFila(f);
        const dimmed = f.status === 'archived';
        return (
          <li
            key={f.id}
            className={cn(
              'card p-3 flex items-center gap-3',
              // Archivadas: fondo apagado en vez de opacidad (contraste del texto)
              dimmed && 'bg-[var(--color-surface-2)]',
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
                  {f.ciudad && <><span>{f.ciudad}</span><span aria-hidden>·</span></>}
                  <span>{formatRelativeDate(f.updatedAt)}</span>
                </span>
              </span>
            </Link>
            <FarmaciaRowActions
              farmacia={f}
              pending={pending}
              onAction={onAction}
                  canDuplicate={canDuplicate}
                  canWrite={canWrite}
            />
          </li>
        );
      })}
    </ul>
  );
}
