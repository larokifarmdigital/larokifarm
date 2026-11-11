'use client';

/**
 * Campo de imagen reutilizable, dos modos.
 *
 *   - mode="multi"  → galería tipo grid (hero, sobre, gallery). Cada tile
 *     abre un modal para editar el texto alternativo por idioma. Ver patrón
 *     canónico FAQs.
 *   - mode="single" → una sola imagen (logo, OG). Al subir reemplaza; botón
 *     "Reemplazar" (abre file picker) y "Eliminar" (con ConfirmDialog). SIN
 *     modal de alt — logo y og no necesitan alt multilang editable aquí.
 *
 * Reglas de diseño:
 *   - Acciones visibles siempre en touch (no hover-only). En desktop
 *     aparecen con hover para no competir con la propia imagen.
 *   - Delete siempre pasa por ConfirmDialog ("confirm before destruction").
 *   - Reemplazo NO confirma: es el flujo esperado del usuario tras pulsar
 *     "Reemplazar".
 */

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { NavIcon } from '@/features/shell/NavIcon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import {
  deleteContentImage,
  uploadContentImage,
} from '@/lib/actions/content-image-actions';
import type { ImagenAsset, Locale } from '@/types/content';
import { LOCALE_LABELS } from '@/types/content';

type Role = 'logo' | 'hero' | 'sobre' | 'servicio' | 'gallery' | 'og';

const LOCALE_FLAGS: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇬🇧',
  ca: '🇦🇩',
};

type BaseProps = {
  businessId: string;
  role: Role;
  label?: string;
  hint?: string;
  className?: string;
};

type MultiProps = BaseProps & {
  mode?: 'multi';
  value: ImagenAsset[];
  onChange: (next: ImagenAsset[]) => void;
  idiomasActivos: Locale[];
  max?: number;
};

type SingleProps = BaseProps & {
  mode: 'single';
  value: ImagenAsset | null | undefined;
  onChange: (next: ImagenAsset | null) => void;
  /** Aspecto del preview. Default square. */
  aspect?: 'square' | 'og' | 'auto';
};

export function ImageGalleryField(props: MultiProps | SingleProps) {
  if (props.mode === 'single') return <SingleImageField {...props} />;
  return <MultiImageField {...props} />;
}

/* =====================================================================
 * MODO SINGLE — logo, OG
 * ===================================================================== */

function SingleImageField({
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
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const res = await uploadContentImage(businessId, role, fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      // Reemplazo: si había una previa (y no es legacy), bórrala del storage.
      if (value?.id && value.id !== 'legacy-logo') {
        void deleteContentImage(businessId, value.id);
      }
      onChange(res.data);
      toast.success('Imagen subida');
    });
  }

  function doDelete() {
    if (!value) return;
    if (value.id === 'legacy-logo') {
      // Imagen legacy (Business.logoUrl) sin fila en content_images: solo
      // quitamos del formulario, no hay nada que borrar del storage.
      onChange(null);
      setConfirmDelete(false);
      return;
    }
    startTransition(async () => {
      const res = await deleteContentImage(businessId, value.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onChange(null);
      setConfirmDelete(false);
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

  const aspectClass =
    aspect === 'og'
      ? 'aspect-[1200/630]'
      : aspect === 'auto'
        ? ''
        : 'aspect-square';

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      {label && (
        <div>
          <div className="text-[13px] font-semibold text-[var(--color-ink)]">
            {label}
          </div>
          {hint && (
            <div className="text-[12px] text-[var(--color-muted)] mt-0.5">
              {hint}
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
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
            className={cn(
              'h-full w-full',
              aspect === 'og' ? 'object-cover' : 'object-contain',
            )}
          />

          <div
            className={cn(
              'absolute inset-0 flex items-end justify-between gap-1 p-2',
              'bg-gradient-to-t from-black/55 via-black/10 to-transparent',
              'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
              'transition-opacity duration-150',
            )}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isPending}
              aria-label="Reemplazar imagen"
              className="flex h-8 items-center gap-1 rounded-full bg-white px-2.5 text-[12px] font-medium text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-surface-sunken)] disabled:opacity-60"
            >
              <NavIcon name="ArrowsClockwise" size={12} />
              Reemplazar
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={isPending}
              aria-label="Eliminar imagen"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--color-red-ink)] shadow-sm hover:bg-[var(--color-red-soft)] disabled:opacity-60"
            >
              <NavIcon name="Trash" size={13} />
            </button>
          </div>
        </figure>
      ) : (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={(e) => {
            e.preventDefault();
            inputRef.current?.click();
          }}
          className={cn(
            'relative flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-[10px] border-2 border-dashed cursor-pointer text-[13px] transition-colors',
            aspectClass && aspect === 'og' && 'aspect-[1200/630]',
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
              <NavIcon name="Image" size={20} />
              <span className="font-medium">Arrastra una imagen o haz click</span>
              <span className="text-[11px] text-[var(--color-muted-2)]">
                PNG, JPG, WebP o SVG · máx 10 MB
              </span>
            </>
          )}
        </label>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar esta imagen?"
        description="Se borrará del almacenamiento y dejará de aparecer en la landing. No se puede deshacer."
        confirmLabel="Eliminar imagen"
        onConfirm={doDelete}
      />
    </div>
  );
}

/* =====================================================================
 * MODO MULTI — hero, sobre, gallery
 * ===================================================================== */

type AltStatus = 'complete' | 'partial' | 'empty';

function getAltStatus(img: ImagenAsset, activeLocales: Locale[]): AltStatus {
  const filled = activeLocales.filter((l) => !!img.alt?.[l]?.trim()).length;
  if (filled === 0) return 'empty';
  if (filled === activeLocales.length) return 'complete';
  return 'partial';
}

function MultiImageField({
  businessId,
  role,
  value,
  onChange,
  idiomasActivos,
  max,
  label,
  hint,
  className,
}: MultiProps) {
  const [isPending, startTransition] = useTransition();
  const [dragging, setDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const editing = value.find((x) => x.id === editingId) ?? null;
  const confirmDelete = value.find((x) => x.id === confirmDeleteId) ?? null;
  const canAdd = max === undefined || value.length < max;

  async function handleFile(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const res = await uploadContentImage(businessId, role, fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      onChange([...value, res.data]);
      toast.success('Imagen subida');
    });
  }

  async function doDelete(img: ImagenAsset) {
    startTransition(async () => {
      const res = await deleteContentImage(businessId, img.id);
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

  function updateAlt(id: string, locale: Locale, alt: string) {
    onChange(
      value.map((x) =>
        x.id === id ? { ...x, alt: { ...x.alt, [locale]: alt } } : x,
      ),
    );
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
    <div className={cn('flex flex-col gap-3', className)}>
      {label && (
        <div>
          <div className="text-[13px] font-semibold text-[var(--color-ink)]">
            {label}
          </div>
          {hint && (
            <div className="text-[12px] text-[var(--color-muted)] mt-0.5">
              {hint}
            </div>
          )}
        </div>
      )}

      {(value.length > 0 || canAdd) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {value.map((img, i) => {
            const status = getAltStatus(img, idiomasActivos);
            return (
              <figure
                key={img.id}
                className="group relative overflow-hidden rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface-sunken)] aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />

                <span
                  aria-label={
                    status === 'complete'
                      ? 'Texto alternativo completo'
                      : status === 'partial'
                        ? 'Texto alternativo incompleto'
                        : 'Sin texto alternativo'
                  }
                  title={
                    status === 'complete'
                      ? 'Alt rellenado en todos los idiomas'
                      : status === 'partial'
                        ? 'Alt incompleto — faltan idiomas'
                        : 'Sin texto alternativo'
                  }
                  className={cn(
                    'absolute top-1.5 left-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white/90 shadow-sm',
                    status === 'complete' && 'bg-[var(--color-green-ink)]',
                    status === 'partial' && 'bg-[var(--color-accent)]',
                    status === 'empty' && 'bg-white/70',
                  )}
                />

                <div
                  className={cn(
                    'absolute inset-0 flex items-end justify-between gap-1 p-2',
                    'bg-gradient-to-t from-black/55 via-black/10 to-transparent',
                    'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
                    'transition-opacity duration-150',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setEditingId(img.id)}
                    aria-label={`Editar imagen ${i + 1}`}
                    className="flex h-8 items-center gap-1 rounded-full bg-white px-2.5 text-[12px] font-medium text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-surface-sunken)]"
                  >
                    <NavIcon name="PencilSimple" size={12} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(img.id)}
                    aria-label={`Eliminar imagen ${i + 1}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--color-red-ink)] shadow-sm hover:bg-[var(--color-red-soft)]"
                  >
                    <NavIcon name="Trash" size={13} />
                  </button>
                </div>
              </figure>
            );
          })}

          {canAdd && (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'relative aspect-square flex flex-col items-center justify-center gap-1.5 rounded-[10px] border-2 border-dashed cursor-pointer text-[12.5px] transition-colors',
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
                  <NavIcon name="Plus" size={18} />
                  <span className="font-medium">
                    {value.length === 0 ? 'Añadir imagen' : 'Añadir otra'}
                  </span>
                  <span className="text-[10.5px] text-[var(--color-muted-2)] text-center px-2 leading-tight">
                    PNG, JPG, WebP · máx 10 MB
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
          )}
        </div>
      )}

      {value.length > 0 && (
        <p className="text-[11.5px] text-[var(--color-muted-2)] m-0">
          Click en una imagen para editar el texto alternativo o eliminarla.
        </p>
      )}

      <ImagenDetailModal
        open={!!editing}
        image={editing}
        imageIndex={editing ? value.findIndex((x) => x.id === editing.id) : -1}
        idiomasActivos={idiomasActivos}
        onClose={() => setEditingId(null)}
        onAltChange={updateAlt}
        onRequestDelete={(id) => {
          setEditingId(null);
          setConfirmDeleteId(id);
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDeleteId(null)}
        title="¿Eliminar esta imagen?"
        description="Se borrará del almacenamiento y dejará de aparecer en la landing. No se puede deshacer."
        confirmLabel="Eliminar imagen"
        onConfirm={() => confirmDelete && void doDelete(confirmDelete)}
      />
    </div>
  );
}

/* ---------- Modal de edición de ALT por idioma (multi) ---------- */

function ImagenDetailModal({
  open,
  image,
  imageIndex,
  idiomasActivos,
  onClose,
  onAltChange,
  onRequestDelete,
}: {
  open: boolean;
  image: ImagenAsset | null;
  imageIndex: number;
  idiomasActivos: Locale[];
  onClose: () => void;
  onAltChange: (id: string, locale: Locale, alt: string) => void;
  onRequestDelete: (id: string) => void;
}) {
  if (!image) return null;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Imagen ${imageIndex + 1}`}
      description="Edita el texto alternativo que leerán buscadores y lectores de pantalla."
      maxWidth="md"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="md"
            onClick={() => onRequestDelete(image.id)}
            className="!text-[var(--color-red-ink)] hover:!bg-[var(--color-red-soft)]"
          >
            <NavIcon name="Trash" size={13} />
            Eliminar
          </Button>
          <Button variant="accent" size="md" onClick={onClose}>
            Hecho
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-[var(--radius-sm)] overflow-hidden bg-[var(--color-surface-sunken)] border border-[var(--color-hairline)] aspect-[16/9] flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt=""
            className="w-full h-full object-contain"
          />
        </div>

        <div className="space-y-3">
          <Label className="mb-0">Texto alternativo por idioma</Label>
          <p className="text-[11.5px] text-[var(--color-muted)] m-0 -mt-1.5">
            Describe lo que se ve. Mejora el SEO y la accesibilidad.
          </p>
          {idiomasActivos.map((loc) => (
            <div key={loc} className="flex items-center gap-2">
              <span
                className="shrink-0 inline-flex items-center gap-1.5 h-9 px-2.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] text-[11.5px] font-medium text-[var(--color-muted)]"
                aria-label={LOCALE_LABELS[loc]}
                title={LOCALE_LABELS[loc]}
              >
                <span aria-hidden>{LOCALE_FLAGS[loc]}</span>
                <span className="uppercase tracking-[0.04em]">{loc}</span>
              </span>
              <Input
                value={image.alt?.[loc] ?? ''}
                onChange={(e) => onAltChange(image.id, loc, e.target.value)}
                placeholder={
                  loc === 'es'
                    ? 'Ej.: Fachada de la farmacia desde la acera'
                    : loc === 'en'
                      ? 'E.g.: Pharmacy storefront from the street'
                      : 'Ex.: Façana de la farmàcia des de la vorera'
                }
              />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
