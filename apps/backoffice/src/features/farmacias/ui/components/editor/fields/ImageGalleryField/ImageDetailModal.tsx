import type { ImagenAsset } from '@/core/farmacias/domain';
import { LOCALE_LABELS, type Locale } from '@/core/shared';
import { Button } from '@/shared/components/atoms/Button';
import { Input } from '@/shared/components/atoms/Input';
import { Label } from '@/shared/components/atoms/Label';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Modal } from '@/shared/components/molecules/Modal';
import { LOCALE_FLAGS } from './imageFieldShared';

/** Modal de edición del texto alternativo por idioma (modo multi). */
export function ImageDetailModal({
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
