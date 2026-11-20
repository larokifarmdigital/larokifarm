import type { ImagenAsset } from '@/core/farmacias/domain';
import { LOCALE_FLAGS, LOCALE_LABELS, type Locale } from '@/core/shared';
import { Button } from '@/shared/components/atoms/Button';
import { Input } from '@/shared/components/atoms/Input';
import { Label } from '@/shared/components/atoms/Label';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Modal } from '@/shared/components/molecules/Modal';

/** Modal de edición del texto alternativo por idioma (modo multi). */
export function ImageDetailModal({
  open,
  image,
  imageIndex,
  idiomasActivos,
  onClose,
  onAltChange,
  onRequestDelete,
  total,
  onMove,
}: {
  open: boolean;
  image: ImagenAsset | null;
  imageIndex: number;
  idiomasActivos: Locale[];
  onClose: () => void;
  onAltChange: (id: string, locale: Locale, alt: string) => void;
  onRequestDelete: (id: string) => void;
  /** Para mover la foto (orden en la web). */
  total?: number;
  onMove?: (delta: -1 | 1) => void;
}) {
  if (!image) return null;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={total ? `Foto ${imageIndex + 1} de ${total}` : `Foto ${imageIndex + 1}`}
      description="Describe la foto y elige su posición en tu web."
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

        {onMove && total !== undefined && total > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13.5px] text-[var(--color-ink-2)] mr-1">Posición:</span>
            <Button type="button" variant="secondary" size="sm" disabled={imageIndex <= 0} onClick={() => onMove(-1)}>
              <NavIcon name="CaretLeft" size={13} />
              Mover a la izquierda
            </Button>
            <Button type="button" variant="secondary" size="sm" disabled={imageIndex >= total - 1} onClick={() => onMove(1)}>
              Mover a la derecha
              <NavIcon name="CaretRight" size={13} />
            </Button>
          </div>
        )}

        <div className="space-y-3">
          <p className="label m-0">Descripción de la foto</p>
          <p className="text-[12.5px] text-[var(--color-muted)] m-0 -mt-1.5">
            Qué se ve en la foto. La leen Google y las personas que usan lector de pantalla.
          </p>
          {idiomasActivos.map((loc) => (
            <div key={loc}>
              <Label htmlFor={`alt-${image.id}-${loc}`} className="mb-1">
                <span aria-hidden className="mr-1.5">{LOCALE_FLAGS[loc]}</span>
                {LOCALE_LABELS[loc]}
              </Label>
              <Input
                id={`alt-${image.id}-${loc}`}
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
