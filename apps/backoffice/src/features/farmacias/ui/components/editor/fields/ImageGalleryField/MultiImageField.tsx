'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { ImagenAsset } from '@/core/farmacias/domain';
import type { Locale } from '@/core/shared';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { cn } from '@/shared/lib/cn';
import {
  deleteContentImage,
  reorderContentImages,
  updateContentImageAlt,
  uploadContentImage,
} from '@/features/farmacias/actions/contentImageActions';
import { AltStatusDot, getAltStatus } from './AltStatusDot';
import { ImageDetailModal } from './ImageDetailModal';
import { ACCEPTED_IMAGE_TYPES, type MultiProps } from './imageFieldShared';
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

/** Modo multi — hero, sobre, gallery. Grid de tiles + modal de alt por idioma. */
export function MultiImageField({
  businessId,
  role,
  value,
  onChange,
  idiomasActivos,
  max,
  label,
  hint,
  className,
  required,
}: MultiProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const editing = value.find((x) => x.id === editingId) ?? null;
  // Alt al abrir el modal: al cerrarlo se guarda solo si cambió.
  const [altSnapshot, setAltSnapshot] = useState<string>('');
  const confirmDelete = value.find((x) => x.id === confirmDeleteId) ?? null;
  const canAdd = max === undefined || value.length < max;

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
      onChange([...value, res.data]);
      toast.success('Imagen subida');
    });
  }

  const { dragging, inputRef, onInputChange, dropHandlers } = useImageFilePicker(handleFile);

  function doDelete(img: ImagenAsset) {
    startTransition(async () => {
      const res = await deleteContentImage(businessId, img.id).catch(() => ({ ok: false as const, error: 'No se pudo borrar. Revisa la conexión.' }));
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onChange(value.filter((x) => x.id !== img.id));
      setConfirmDeleteId(null);
      setEditingId(null);
      toast.success('Imagen borrada');
    });
  }

  /** Mover una foto a izquierda/derecha (orden en la web). Se guarda al momento. */
  function moveImage(id: string, delta: -1 | 1) {
    const from = value.findIndex((x) => x.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= value.length) return;
    const next = [...value];
    [next[from], next[to]] = [next[to], next[from]];
    const previous = value;
    onChange(next);
    startTransition(async () => {
      const res = await reorderContentImages(businessId, role, next.map((x) => x.id)).catch(() => ({
        ok: false as const,
        error: 'No se pudo cambiar el orden. Revisa la conexión.',
      }));
      if (!res.ok) {
        onChange(previous);
        toast.error(res.error);
      }
    });
  }

  function updateAlt(id: string, locale: Locale, alt: string) {
    onChange(value.map((x) => (x.id === id ? { ...x, alt: { ...x.alt, [locale]: alt } } : x)));
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <FieldHeading label={label} hint={hint} required={required} />

      {(value.length > 0 || canAdd) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((img, i) => (
            <figure
              key={img.id}
              className="group relative overflow-hidden rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] aspect-square"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />

              <AltStatusDot status={getAltStatus(img, idiomasActivos)} />

              <ImageActionsOverlay>
                <button
                  type="button"
                  onClick={() => {
                    setAltSnapshot(JSON.stringify(img.alt ?? {}));
                    setEditingId(img.id);
                  }}
                  aria-label={`Editar foto ${i + 1}`}
                  className={OVERLAY_PILL_BUTTON}
                >
                  <NavIcon name="PencilSimple" size={12} />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(img.id)}
                  aria-label={`Eliminar foto ${i + 1}`}
                  className={OVERLAY_DELETE_BUTTON}
                >
                  <NavIcon name="Trash" size={13} />
                </button>
              </ImageActionsOverlay>
            </figure>
          ))}

          {canAdd && (
            <label
              {...dropHandlers}
              className={cn(
                'relative aspect-square flex flex-col items-center justify-center gap-1.5 rounded-[10px] border-2 border-dashed cursor-pointer text-[13px] transition-colors',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--color-accent)] has-[:focus-visible]:outline-offset-2',
                dropZoneClass(dragging, isPending),
              )}
            >
              {isPending ? (
                <span className="animate-pulse">Subiendo…</span>
              ) : (
                <>
                  <NavIcon name="Plus" size={18} />
                  <span className="font-medium">
                    {value.length === 0 ? 'Añadir foto' : 'Añadir otra'}
                  </span>
                  <span className="text-[12px] text-[var(--color-muted)] text-center px-2 leading-tight">
                    JPG, PNG o WebP
                  </span>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                aria-label={label ? `Subir ${label.toLowerCase()}` : 'Subir foto'}
                accept={ACCEPTED_IMAGE_TYPES}
                onChange={onInputChange}
                disabled={isPending}
                className="sr-only"
              />
            </label>
          )}
        </div>
      )}

      {value.length > 0 && (
        <p className="text-[12.5px] text-[var(--color-muted)] m-0">
          Pulsa «Editar» en una foto para describirla, cambiarla de sitio o eliminarla.
        </p>
      )}

      <ImageDetailModal
        open={!!editing}
        image={editing}
        imageIndex={editing ? value.findIndex((x) => x.id === editing.id) : -1}
        idiomasActivos={idiomasActivos}
        onClose={() => {
          if (editing && JSON.stringify(editing.alt ?? {}) !== altSnapshot) {
            const { id, alt } = editing;
            startTransition(async () => {
              const res = await updateContentImageAlt(businessId, id, alt).catch(() => ({
                ok: false as const,
                error: 'No se pudo guardar el texto alternativo. Revisa la conexión.',
              }));
              if (!res.ok) toast.error(res.error);
              else toast.success('Texto alternativo guardado');
            });
          }
          setEditingId(null);
        }}
        onAltChange={updateAlt}
        total={value.length}
        onMove={(d) => editing && moveImage(editing.id, d)}
        onRequestDelete={(id) => {
          setEditingId(null);
          setConfirmDeleteId(id);
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
        {...DELETE_CONFIRM_COPY}
        onConfirm={() => confirmDelete && doDelete(confirmDelete)}
      />
    </div>
  );
}
