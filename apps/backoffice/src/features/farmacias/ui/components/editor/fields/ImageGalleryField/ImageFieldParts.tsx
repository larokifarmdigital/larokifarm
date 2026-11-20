import { cn } from '@/shared/lib/cn';

export function FieldHeading({ label, hint, required }: { label?: string; hint?: string; required?: boolean }) {
  if (!label) return null;
  return (
    <div>
      <div className="text-[13px] font-semibold text-[var(--color-ink)]">
        {label}
        {required && (
          <>
            <span aria-hidden className="ml-1 text-[var(--color-red-ink)] text-[1.3em] font-bold leading-none" title="Campo obligatorio">
              *
            </span>
            <span className="sr-only">, obligatorio</span>
          </>
        )}
      </div>
      {hint && <div className="text-[12px] text-[var(--color-muted)] mt-0.5">{hint}</div>}
    </div>
  );
}

/** Capa de acciones sobre la imagen: siempre visible en touch, hover en desktop. */
export function ImageActionsOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex items-end justify-between gap-1 p-2',
        'bg-gradient-to-t from-black/55 via-black/10 to-transparent',
        'opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
        'transition-opacity duration-150',
      )}
    >
      {children}
    </div>
  );
}

export const OVERLAY_PILL_BUTTON =
  'flex h-11 sm:h-8 items-center gap-1 rounded-full bg-white px-3 sm:px-2.5 text-[13px] sm:text-[12px] font-medium text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-surface-sunken)]';
export const OVERLAY_DELETE_BUTTON =
  'flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white text-[var(--color-red-ink)] shadow-sm hover:bg-[var(--color-red-soft)]';

export function dropZoneClass(dragging: boolean, isPending: boolean) {
  return cn(
    dragging
      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
      : 'border-[var(--color-control-border)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink)]',
    isPending && 'pointer-events-none opacity-60',
  );
}

export const DELETE_CONFIRM_COPY = {
  title: '¿Eliminar esta imagen?',
  description:
    'Dejará de salir en tu web. No se puede deshacer.',
  confirmLabel: 'Eliminar imagen',
} as const;
