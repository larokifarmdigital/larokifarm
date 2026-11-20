'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { FarmaciaSummary } from '@/core/farmacias/domain';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { landingUrl } from '@/shared/lib/landingUrl';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { DeleteFarmaciaDialog } from './DeleteFarmaciaDialog';
import {
  archiveFarmaciaAction,
  deleteFarmaciaAction,
  duplicateFarmaciaAction,
  publishFarmaciaAction,
} from '@/features/farmacias/actions/farmaciaActions';

/** Ejecuta la acción dentro del transition compartido de la lista. */
export type RowActionRunner = (fn: () => void | Promise<void>) => void;

export function FarmaciaRowActions({
  farmacia,
  pending,
  onAction,
  canDuplicate,
  canWrite,
}: {
  farmacia: FarmaciaSummary;
  pending: boolean;
  onAction: RowActionRunner;
  /** Duplicar = crear farmacia → solo SUPER_ADMIN. */
  canDuplicate: boolean;
  /** Publicar/archivar: no para el rol de solo lectura. */
  canWrite: boolean;
}) {
  const webUrl = landingUrl(farmacia.web);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmBorrador, setConfirmBorrador] = useState(false);
  return (
    <>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Acciones para ${farmacia.nombre}`}
        disabled={pending}
        className="inline-flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-[6px] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        <NavIcon name="DotsThreeVertical" size={18} weight="bold" />
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
              className="flex items-center gap-2 px-2.5 min-h-11 sm:min-h-9 rounded-[4px] text-[14px] sm:text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none"
            >
              <NavIcon name="PencilSimple" size={13} /> Editar
            </Link>
          </DropdownMenu.Item>
          {canDuplicate && (
          <DropdownMenu.Item
            className="flex items-center gap-2 px-2.5 min-h-11 sm:min-h-9 rounded-[4px] text-[14px] sm:text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none cursor-pointer"
            onSelect={() => {
              onAction(async () => {
                const res = await duplicateFarmaciaAction(farmacia.id);
                if (!res.ok) throw new Error(res.error);
                toast.success(`"${farmacia.nombre}" duplicada`);
              });
            }}
          >
            <NavIcon name="Copy" size={13} /> Duplicar
          </DropdownMenu.Item>
          )}
          {webUrl ? (
            <DropdownMenu.Item asChild>
              <a
                href={webUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-2.5 min-h-11 sm:min-h-9 rounded-[4px] text-[14px] sm:text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none"
              >
                <NavIcon name="ArrowSquareOut" size={13} /> Ver su web
              </a>
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item
              disabled
              title="Falta la dirección de la web en Contacto y dirección"
              className="flex items-center gap-2 px-2.5 min-h-11 sm:min-h-9 rounded-[4px] text-[14px] sm:text-[13px] text-[var(--color-muted-2)] outline-none"
            >
              <NavIcon name="ArrowSquareOut" size={13} /> Ver su web
              <span className="ml-auto text-[12px]">Sin web</span>
            </DropdownMenu.Item>
          )}
          {canWrite && (farmacia.status === 'published' ? (
            <DropdownMenu.Item
              className="flex items-center gap-2 px-2.5 min-h-11 sm:min-h-9 rounded-[4px] text-[14px] sm:text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none cursor-pointer"
              onSelect={() => setConfirmBorrador(true)}
            >
              <NavIcon name="PencilSimple" size={13} /> Pasar a borrador
            </DropdownMenu.Item>
          ) : farmacia.status === 'draft' ? (
            <DropdownMenu.Item asChild>
              <Link
                href={`/farmacias/${farmacia.id}`}
                className="flex items-center gap-2 px-2.5 min-h-11 sm:min-h-9 rounded-[4px] text-[14px] sm:text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none"
              >
                <NavIcon name="Check" size={13} /> Abrir para publicar
              </Link>
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item
              className="flex items-center gap-2 px-2.5 min-h-11 sm:min-h-9 rounded-[4px] text-[14px] sm:text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none cursor-pointer"
              onSelect={() => {
                onAction(async () => {
                  const res = await publishFarmaciaAction(farmacia.id, false);
                  if (!res.ok) throw new Error(res.error);
                  toast.success(`"${farmacia.nombre}" restaurada como borrador`);
                });
              }}
            >
              <NavIcon name="ArrowsClockwise" size={13} /> Restaurar como borrador
            </DropdownMenu.Item>
          ))}
          {canWrite && <DropdownMenu.Separator className="h-px bg-[var(--color-hairline)] my-1" />}
          {canWrite && farmacia.status !== 'archived' && (
          <DropdownMenu.Item
            className="flex items-center gap-2 px-2.5 min-h-11 sm:min-h-9 rounded-[4px] text-[14px] sm:text-[13px] text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)] outline-none cursor-pointer"
            onSelect={() => setConfirmArchive(true)}
          >
            <NavIcon name="Archive" size={13} /> Archivar
          </DropdownMenu.Item>
          )}
          {canDuplicate && farmacia.status === 'archived' && (
            <>
              <DropdownMenu.Separator className="h-px bg-[var(--color-hairline)] my-1" />
              <DropdownMenu.Item
                className="flex items-center gap-2 px-2.5 min-h-11 sm:min-h-9 rounded-[4px] text-[14px] sm:text-[13px] text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)] outline-none cursor-pointer"
                onSelect={() => setConfirmDelete(true)}
              >
                <NavIcon name="Trash" size={13} /> Eliminar definitivamente
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
    <ConfirmDialog
      open={confirmArchive}
      onOpenChange={setConfirmArchive}
      title={`¿Archivar "${farmacia.nombre}"?`}
      description="Dejará de estar disponible para la web. Podrás restaurarla como borrador o, si no tiene datos del conciliador, eliminarla definitivamente."
      confirmLabel="Archivar"
      onConfirm={() => {
        setConfirmArchive(false);
        onAction(async () => {
          const res = await archiveFarmaciaAction(farmacia.id);
          if (!res.ok) throw new Error(res.error);
          toast.message(`"${farmacia.nombre}" archivada`);
        });
      }}
    />
    <ConfirmDialog
      open={confirmBorrador}
      onOpenChange={setConfirmBorrador}
      title={`¿Pasar "${farmacia.nombre}" a borrador?`}
      description="Su web seguirá mostrando lo último publicado, pero ya no se actualizará con los cambios hasta que vuelvas a publicarla."
      confirmLabel="Pasar a borrador"
      variant="accent"
      onConfirm={() => {
        setConfirmBorrador(false);
        onAction(async () => {
          const res = await publishFarmaciaAction(farmacia.id, false);
          if (!res.ok) throw new Error(res.error);
          toast.success(`"${farmacia.nombre}" pasada a borrador`);
        });
      }}
    />
    <DeleteFarmaciaDialog
      open={confirmDelete}
      onOpenChange={setConfirmDelete}
      nombre={farmacia.nombre}
      onConfirm={() => {
        setConfirmDelete(false);
        onAction(async () => {
          const res = await deleteFarmaciaAction(farmacia.id);
          if (!res.ok) throw new Error(res.error);
          toast.success(`"${farmacia.nombre}" eliminada`);
        });
      }}
    />
    </>
  );
}
