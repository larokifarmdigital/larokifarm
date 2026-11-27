import Link from 'next/link';
import type { FarmaciaSummary } from '@/core/farmacias/domain';
import { LOCALE_LABELS, type Locale } from '@/core/shared';
import { Chip } from '@/shared/components/atoms/Chip';
import { cn } from '@/shared/lib/cn';
import { formatRelativeDate } from '@/shared/lib/format';
import { FarmaciaAvatar } from './FarmaciaAvatar';
import { FarmaciaRowActions, type RowActionRunner } from './FarmaciaRowActions';
import { estadoFila } from './statusMeta';

export function FarmaciasTable({
  farmacias,
  resaltada,
  pending,
  onAction,
  canDuplicate,
  canWrite,
}: {
  farmacias: FarmaciaSummary[];
  /** Id de la farmacia recién creada (se resalta). */
  resaltada?: string;
  pending: boolean;
  onAction: RowActionRunner;
  canDuplicate: boolean;
  canWrite: boolean;
}) {
  return (
    <div className="hidden md:block card overflow-hidden">
    <table className="w-full text-left text-[14px]">
      <caption className="sr-only">Farmacias</caption>
      <thead>
        <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[12.5px] text-[var(--color-muted)]">
          <th scope="col" className="pl-5 pr-3 py-2.5 font-semibold">Farmacia</th>
          <th scope="col" className="px-3 py-2.5 font-semibold">Ciudad</th>
          <th scope="col" className="px-3 py-2.5 font-semibold hidden lg:table-cell">Idiomas</th>
          <th scope="col" className="px-3 py-2.5 font-semibold">Estado</th>
          <th scope="col" className="px-3 py-2.5 font-semibold hidden lg:table-cell">Actualizado</th>
          <th scope="col" className="pl-3 pr-5 py-2.5 text-right w-14">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {farmacias.map((f, i) => {
          const st = estadoFila(f);
          const dimmed = f.status === 'archived';
          return (
            <tr
              key={f.id}
              className={cn(
                'group border-b border-[var(--color-hairline)] last:border-b-0 hover:bg-[var(--color-surface-sunken)]/60 transition-colors',
                i % 2 === 1 && 'bg-[var(--color-surface-2)]',
                // Archivadas: fondo apagado en vez de opacidad (la opacidad dejaba el texto a 2,7:1)
                dimmed && 'bg-[var(--color-surface-sunken)]/50',
                f.id === resaltada && 'bg-[var(--color-accent-soft)] hover:bg-[var(--color-accent-soft)]',
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
                      className="text-[11.5px] font-medium uppercase text-[var(--color-ink-2)] bg-[var(--color-surface-sunken)] rounded px-1.5 py-0.5"
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
                  canDuplicate={canDuplicate}
                  canWrite={canWrite}
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
