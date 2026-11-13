'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { cn } from '@/shared/lib/cn';
import {
  deleteContentImage,
  uploadContentImage,
} from '@/features/farmacias/actions/contentImageActions';
import { ACCEPTED_IMAGE_TYPES, type SingleProps } from './imageFieldShared';
import {
  DELETE_CONFIRM_COPY,
  FieldHeading,
  ImageActionsOverlay,
  OVERLAY_DELETE_BUTTON,
  OVERLAY_PILL_BUTTON,
  dropZoneClass,
} from './ImageFieldParts';
import { useImageFilePicker } from './useImageFilePicker';
import { UPLOAD_NETWORK_ERROR, prepareImageUpload } from './prepareImageUpload';

/** Imagen legacy (Business.logoUrl) sin fila en content_images. */
const LEGACY_LOGO_ID = 'legacy-logo';

/** Modo single — logo, OG. Subir reemplaza la anterior. */
export function SingleImageField({
  businessId,
  role,
  value,
  onChange,
  label,
  hint,
  className,
  aspect = 'square',
}: SingleProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleFile(raw: File) {
    startTransition(async () => {
      const prepared = await prepareImageUpload(raw);
      if (!prepared.ok) {
        toast.error(prepared.error);
        return;
      }
      const fd = new FormData();
      fd.append('file', prepared.file);
      let res: Awaited<ReturnType<typeof uploadContentImage>>;
      try {
        res = await uploadContentImage(businessId, role, fd);
      } catch {
        toast.error(UPLOAD_NETWORK_ERROR);
        return;
      }
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // Reemplazo: si había una previa (y no es legacy), bórrala del storage.
      if (value?.id && value.id !== LEGACY_LOGO_ID) {
        void deleteContentImage(businessId, value.id);
      }
      onChange(res.data);
      toast.success('Imagen subida');
    });
  }

  const { dragging, inputRef, onInputChange, dropHandlers, openPicker } = useImageFilePicker(handleFile);

  function doDelete() {
    if (!value) return;
    if (value.id === LEGACY_LOGO_ID) {
      // Solo se quita del formulario: no hay nada que borrar del storage.
      onChange(null);
      setConfirmDelete(false);
      return;
    }
    startTransition(async () => {
      const res = await deleteContentImage(businessId, value.id).catch(() => ({ ok: false as const, error: 'No se pudo borrar. Revisa la conexión.' }));
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onChange(null);
      setConfirmDelete(false);
      toast.success('Imagen borrada');
    });
  }

  const aspectClass = aspect === 'og' ? 'aspect-[1200/630]' : aspect === 'auto' ? '' : 'aspect-square';

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <FieldHeading label={label} hint={hint} />

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        onChange={onInputChange}
        disabled={isPending}
        className="sr-only"
      />

      {value ? (
        <figure
          className={cn(
            'group relative overflow-hidden rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)]',
            aspectClass,
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value.url}
            alt={label ?? ''}
            className={cn('h-full w-full', aspect === 'og' ? 'object-cover' : 'object-contain')}
          />

          <ImageActionsOverlay>
            <button
              type="button"
              onClick={openPicker}
              disabled={isPending}
              aria-label="Reemplazar imagen"
              className={cn(OVERLAY_PILL_BUTTON, 'disabled:opacity-60')}
            >
              <NavIcon name="ArrowsClockwise" size={12} />
              Reemplazar
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              aria-label="Eliminar imagen"
              className={cn(OVERLAY_DELETE_BUTTON, 'disabled:opacity-60')}
            >
              <NavIcon name="Trash" size={13} />
            </button>
          </ImageActionsOverlay>
        </figure>
      ) : (
        <label
          {...dropHandlers}
          onClick={(e) => {
            e.preventDefault();
            openPicker();
          }}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-[10px] border-2 border-dashed cursor-pointer text-[13px] transition-colors',
            aspect === 'og' && 'aspect-[1200/630]',
            dropZoneClass(dragging, isPending),
          )}
        >
          {isPending ? (
            <span className="animate-pulse">Subiendo…</span>
          ) : (
            <>
              <NavIcon name="Image" size={20} />
              <span className="font-medium">Arrastra una imagen o haz click</span>
              <span className="text-[11px] text-[var(--color-muted-2)]">
                PNG, JPG, WebP o SVG · se optimizan al subir
              </span>
            </>
          )}
        </label>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        {...DELETE_CONFIRM_COPY}
        onConfirm={doDelete}
      />
    </div>
  );
}
