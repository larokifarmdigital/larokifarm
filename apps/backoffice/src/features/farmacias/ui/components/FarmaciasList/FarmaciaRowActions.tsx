'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { FarmaciaSummary } from '@/core/farmacias/domain';
import {
  RowActionsItem,
  RowActionsMenu,
  RowActionsSeparator,
} from '@/shared/components/molecules/RowActionsMenu';
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
  /** Duplicar = crear farmacia → solo SUPER_ADMIN (también archivar y eliminar). */
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
    <RowActionsMenu label={`Acciones para ${farmacia.nombre}`} disabled={pending}>
      <RowActionsItem icon="PencilSimple" href={`/farmacias/${farmacia.id}`}>
        Editar su web
      </RowActionsItem>
      {canDuplicate && (
        <RowActionsItem
          icon="Copy"
          onSelect={() => {
            onAction(async () => {
              const res = await duplicateFarmaciaAction(farmacia.id);
              if (!res.ok) throw new Error(res.error);
              toast.success(`"${farmacia.nombre}" duplicada`);
            });
          }}
        >
          Duplicar
        </RowActionsItem>
      )}
      {webUrl ? (
        <RowActionsItem icon="ArrowSquareOut" href={webUrl} externo>
          Ver su web
        </RowActionsItem>
      ) : (
        <RowActionsItem icon="ArrowSquareOut" disabled title="Falta la dirección de la web en Contacto y dirección" extra="Sin web">
          Ver su web
        </RowActionsItem>
      )}
      {canWrite &&
        (farmacia.status === 'published' ? (
          <RowActionsItem icon="EyeSlash" onSelect={() => setConfirmBorrador(true)}>
            Pasar a borrador
          </RowActionsItem>
        ) : farmacia.status === 'draft' ? (
          <RowActionsItem icon="Check" href={`/farmacias/${farmacia.id}`}>
            Abrir para publicar
          </RowActionsItem>
        ) : canDuplicate ? (
          // Restaurar una archivada: como archivar, solo el administrador.
          <RowActionsItem
            icon="ArrowCounterClockwise"
            onSelect={() => {
              onAction(async () => {
                const res = await publishFarmaciaAction(farmacia.id, false);
                if (!res.ok) throw new Error(res.error);
                toast.success(`"${farmacia.nombre}" restaurada como borrador`);
              });
            }}
          >
            Restaurar como borrador
          </RowActionsItem>
        ) : null)}
      {canDuplicate && canWrite && farmacia.status !== 'archived' && (
        <>
          <RowActionsSeparator />
          <RowActionsItem icon="Archive" peligro onSelect={() => setConfirmArchive(true)}>
            Archivar
          </RowActionsItem>
        </>
      )}
      {canDuplicate && farmacia.status === 'archived' && (
        <>
          <RowActionsSeparator />
          <RowActionsItem icon="Trash" peligro onSelect={() => setConfirmDelete(true)}>
            Eliminar definitivamente
          </RowActionsItem>
        </>
      )}
    </RowActionsMenu>
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
