import { NavIcon } from '@/shared/components/atoms/NavIcon';

/** Mensaje de error bajo un campo (ver useFieldError). No pinta nada si no hay error. */
export function FieldError({ message, errorId }: { message?: string; errorId: string }) {
  if (!message) return null;
  return (
    <p id={errorId} role="alert" className="mt-1.5 mb-0 flex items-start gap-1.5 text-[12px] leading-[1.4] text-[var(--color-red-ink)]">
      <NavIcon name="Warning" size={12} className="mt-[2px] shrink-0" />
      <span>{message}</span>
    </p>
  );
}
