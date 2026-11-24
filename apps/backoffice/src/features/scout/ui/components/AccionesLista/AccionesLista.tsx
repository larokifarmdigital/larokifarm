'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { Modal, ModalAcciones } from '@/shared/components/molecules/Modal';
import { Label } from '@/shared/components/atoms/Label';
import { RowActionsItem, RowActionsMenu, RowActionsNote, RowActionsSeparator } from '@/shared/components/molecules/RowActionsMenu';
import { eliminarListaAction, renombrarListaAction } from '../../../actions/listasActions';

/**
 * Menú ⋯ de una lista (fila o cabecera): Descargar Excel · Renombrar · Eliminar.
 * `trasEliminar`: a dónde llevar el foco/la navegación al borrarla.
 */
export function AccionesLista({
  lista,
  excelRunId,
  activa,
  ejecuciones,
  trasEliminar,
}: {
  lista: { id: string; nombre: string };
  /** Comparación de la que se descarga el Excel (si hay resultados). */
  excelRunId: string | null;
  /** Hay una comparación en marcha: no se puede eliminar. */
  activa: boolean;
  ejecuciones: number;
  trasEliminar: 'listas' | 'refrescar';
}) {
  const router = useRouter();
  const [renombrar, setRenombrar] = useState(false);
  const [eliminar, setEliminar] = useState(false);
  const [nombre, setNombre] = useState(lista.nombre);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  const idNombre = `renombrar-${lista.id}`;

  function guardarNombre(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await renombrarListaAction(lista.id, nombre);
      if (!r.ok) {
        setError(r.error);
        document.getElementById(idNombre)?.focus();
        return;
      }
      toast.success('Nombre cambiado');
      setRenombrar(false);
      router.refresh();
    });
  }

  function borrar() {
    start(async () => {
      const r = await eliminarListaAction(lista.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Lista eliminada');
      setEliminar(false);
      if (trasEliminar === 'listas') router.push('/scout/listas');
      else {
        router.refresh();
        requestAnimationFrame(() => document.getElementById('buscador-listas')?.focus());
      }
    });
  }

  return (
    <>
      <RowActionsMenu label={`Acciones para ${lista.nombre}`}>
        {excelRunId && (
          <RowActionsItem icon="DownloadSimple" href={`/api/precios/comparaciones/${excelRunId}/excel`} externo>
            Descargar Excel
          </RowActionsItem>
        )}
        <RowActionsItem
          icon="PencilSimple"
          onSelect={() => {
            setNombre(lista.nombre);
            setError(null);
            setRenombrar(true);
          }}
        >
          Renombrar
        </RowActionsItem>
        <RowActionsSeparator />
        <RowActionsItem icon="Trash" peligro disabled={activa} onSelect={() => setEliminar(true)}>
          Eliminar lista
        </RowActionsItem>
        {activa && <RowActionsNote>Cancela la comparación para poder eliminarla</RowActionsNote>}
      </RowActionsMenu>

      <Modal
        open={renombrar}
        onOpenChange={setRenombrar}
        title="Renombrar lista"
        maxWidth="sm"
        footer={<ModalAcciones onCancelar={() => setRenombrar(false)} textoPrincipal="Guardar" textoEnviando="Guardando…" enviando={pendiente} form={`${idNombre}-form`} />}
      >
        <form id={`${idNombre}-form`} onSubmit={guardarNombre} noValidate>
          <Label htmlFor={idNombre} required>
            Nombre de la lista
          </Label>
          <input
            id={idNombre}
            className="field"
            value={nombre}
            maxLength={80}
            onChange={(e) => {
              setNombre(e.target.value);
              setError(null);
            }}
            aria-invalid={!!error || undefined}
            aria-describedby={error ? `${idNombre}-error` : undefined}
          />
          {error && (
            <p id={`${idNombre}-error`} className="m-0 mt-1.5 text-[13px] text-[var(--color-red-ink)]">
              {error}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={eliminar}
        onOpenChange={setEliminar}
        title={`¿Eliminar la lista «${lista.nombre}»?`}
        description={`Se borran la lista${ejecuciones ? ` y sus ${ejecuciones} ${ejecuciones === 1 ? 'comparación' : 'comparaciones'}` : ''}. Los Excel que ya descargaste no se ven afectados. No se puede deshacer.`}
        confirmLabel="Eliminar lista"
        cancelLabel="No eliminar"
        variant="danger"
        onConfirm={borrar}
      />
    </>
  );
}
