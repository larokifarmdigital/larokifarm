'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { FarmaciaSummary } from '@/core/farmacias/domain';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import {
  archiveFarmaciaAction,
  duplicateFarmaciaAction,
  publishFarmaciaAction,
} from '@/features/farmacias/actions/farmaciaActions';

/** Ejecuta la acción dentro del transition compartido de la lista. */
export type RowActionRunner = (fn: () => void) => void;

export function FarmaciaRowActions({
  farmacia,
  pending,
  onAction,
}: {
  farmacia: FarmaciaSummary;
  pending: boolean;
  onAction: RowActionRunner;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Acciones para ${farmacia.nombre}`}
        disabled={pending}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        <NavIcon name="DotsSixVertical" size={16} weight="bold" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="min-w-[200px] bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[8px] shadow-[var(--shadow-elevated)] p-1 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item asChild>
            <Link
              href={`/farmacias/${farmacia.id}`}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none"
            >
              <NavIcon name="PencilSimple" size={13} /> Editar
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              onAction(async () => {
                await duplicateFarmaciaAction(farmacia.id);
                toast.success(`"${farmacia.nombre}" duplicada`);
              });
            }}
          >
            <NavIcon name="Copy" size={13} /> Duplicar
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <a
              href={`https://larokifarm.com/${farmacia.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none"
            >
              <NavIcon name="ArrowSquareOut" size={13} /> Ver landing
            </a>
          </DropdownMenu.Item>
          {farmacia.status === 'published' ? (
            <DropdownMenu.Item
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                onAction(async () => {
                  await publishFarmaciaAction(farmacia.id, false);
                  toast.success(`"${farmacia.nombre}" pasada a borrador`);
                });
              }}
            >
              <NavIcon name="PencilSimple" size={13} /> Pasar a borrador
            </DropdownMenu.Item>
          ) : farmacia.status === 'draft' ? (
            <DropdownMenu.Item
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-green-ink)] hover:bg-[var(--color-green-soft)] outline-none cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                onAction(async () => {
                  await publishFarmaciaAction(farmacia.id, true);
                  toast.success(`"${farmacia.nombre}" publicada`);
                });
              }}
            >
              <NavIcon name="Check" size={13} /> Publicar ahora
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Separator className="h-px bg-[var(--color-hairline)] my-1" />
          <DropdownMenu.Item
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)] outline-none cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              onAction(async () => {
                await archiveFarmaciaAction(farmacia.id);
                toast.message(`"${farmacia.nombre}" archivada`);
              });
            }}
          >
            <NavIcon name="Archive" size={13} /> Archivar
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
