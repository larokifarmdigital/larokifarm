import { cn } from '@/shared/lib/cn';

export function FieldHeading({ label, hint }: { label?: string; hint?: string }) {
  if (!label) return null;
  return (
    <div>
      <div className="text-[13px] font-semibold text-[var(--color-ink)]">{label}</div>
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
  'flex h-8 items-center gap-1 rounded-full bg-white px-2.5 text-[12px] font-medium text-[var(--color-ink)] shadow-sm hover:bg-[var(--color-surface-sunken)]';
export const OVERLAY_DELETE_BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--color-red-ink)] shadow-sm hover:bg-[var(--color-red-soft)]';

export function dropZoneClass(dragging: boolean, isPending: boolean) {
  return cn(
    dragging
      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
      : 'border-[var(--color-hairline-strong)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink)]',
    isPending && 'pointer-events-none opacity-60',
  );
}

export const DELETE_CONFIRM_COPY = {
  title: '¿Eliminar esta imagen?',
  description:
    'Se borrará del almacenamiento y dejará de aparecer en la landing. No se puede deshacer.',
  confirmLabel: 'Eliminar imagen',
} as const;
