'use client';

/**
 * Componente reutilizable para subir/borrar imágenes del editor.
 *
 * Dos modos:
 *   - single: muestra una imagen (logo, hero principal). Al subir una nueva,
 *     reemplaza. Llama onChange con la nueva ImagenAsset (o null al borrar).
 *   - multi: muestra todas las imágenes del role actual, permite añadir más y
 *     borrar individualmente. onChange recibe el array completo tras la acción.
 *
 * El componente no persiste orden — la reordenación se hace a nivel de array
 * en el padre y luego el padre llama a reorderContentImages si lo necesita.
 */

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { NavIcon } from '@/features/shell/NavIcon';
import { cn } from '@/lib/utils';
import {
  deleteContentImage,
  uploadContentImage,
} from '@/lib/actions/content-image-actions';
import type { ImagenAsset } from '@/types/content';

type Role = 'logo' | 'hero' | 'sobre' | 'servicio' | 'gallery' | 'og';

type BaseProps = {
  businessId: string;
  role: Role;
  label?: string;
  hint?: string;
  className?: string;
};

type SingleProps = BaseProps & {
  mode: 'single';
  value: ImagenAsset | null | undefined;
  onChange: (next: ImagenAsset | null) => void;
};

type MultiProps = BaseProps & {
  mode: 'multi';
  value: ImagenAsset[];
  onChange: (next: ImagenAsset[]) => void;
  max?: number;
};

export function ImageUploader(props: SingleProps | MultiProps) {
  const [isPending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const list = props.mode === 'multi' ? props.value : props.value ? [props.value] : [];
  const canAdd =
    props.mode === 'single' || props.max === undefined || list.length < props.max;

  async function handleFile(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const res = await uploadContentImage(props.businessId, props.role, fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (props.mode === 'single') {
        // Si había uno previo, lo borramos (reemplazo)
        if (props.value?.id && props.value.id !== 'legacy-logo') {
          void deleteContentImage(props.businessId, props.value.id);
        }
        props.onChange(res.data);
      } else {
        props.onChange([...props.value, res.data]);
      }
      toast.success('Imagen subida');
    });
  }

  async function handleDelete(img: ImagenAsset) {
    if (img.id === 'legacy-logo') {
      // Imagen legacy sin fila en content_images (Business.logoUrl). No podemos borrar
      // del storage porque no existe. Solo quitamos del estado del formulario.
      if (props.mode === 'single') props.onChange(null);
      return;
    }
    startTransition(async () => {
      const res = await deleteContentImage(props.businessId, img.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (props.mode === 'single') props.onChange(null);
      else props.onChange(props.value.filter((x) => x.id !== img.id));
      toast.success('Imagen borrada');
    });
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className={cn('flex flex-col gap-3', props.className)}>
      {props.label && (
        <div>
          <div className="text-[13px] font-semibold text-[var(--color-ink)]">{props.label}</div>
          {props.hint && <div className="text-[12px] text-[var(--color-muted)] mt-0.5">{props.hint}</div>}
        </div>
      )}

      {list.length > 0 && (
        <div
          className={cn(
            'grid gap-3',
            props.mode === 'multi' ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1',
          )}
        >
          {list.map((img) => (
            <figure
              key={img.id}
              className="group relative overflow-hidden rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] aspect-square"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => handleDelete(img)}
                disabled={isPending}
                aria-label="Borrar imagen"
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white grid place-items-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity disabled:opacity-40"
              >
                <NavIcon name="X" size={12} />
              </button>
            </figure>
          ))}
        </div>
      )}

      {canAdd && (
        <>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-[10px] border-2 border-dashed cursor-pointer text-[13px] transition-colors',
              dragging
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                : 'border-[var(--color-hairline-strong)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink)]',
              isPending && 'pointer-events-none opacity-60',
            )}
          >
            {isPending ? (
              <span className="animate-pulse">Subiendo…</span>
            ) : (
              <>
                <NavIcon name="Image" size={18} />
                <span className="font-medium">
                  {list.length === 0
                    ? 'Arrastra una imagen o haz click'
                    : props.mode === 'multi'
                      ? 'Añadir otra imagen'
                      : 'Reemplazar imagen'}
                </span>
                <span className="text-[11px] text-[var(--color-muted-2)]">
                  PNG, JPG, WebP o SVG · máx 10 MB
                </span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
              onChange={onInputChange}
              disabled={isPending}
              className="sr-only"
            />
          </label>
        </>
      )}
    </div>
  );
}
