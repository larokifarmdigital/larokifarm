import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

/**
 * Marca visual de una tarjeta de elección (checkbox o radio). El input real va
 * oculto (`sr-only`) dentro del mismo <label>: toda la tarjeta es la zona de
 * clic y el anillo de foco se pinta en la tarjeta (`has-[:focus-visible]`).
 */
export function IndicadorEleccion({
  tipo,
  marcado,
  desactivado = false,
}: {
  tipo: 'checkbox' | 'radio';
  marcado: boolean;
  desactivado?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border transition-colors',
        tipo === 'radio' ? 'rounded-full' : 'rounded-[5px]',
        marcado
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
          : 'border-[var(--color-control-border)] bg-[var(--color-surface)]',
        desactivado && 'opacity-60',
      )}
    >
      {marcado &&
        (tipo === 'radio' ? (
          <span className="h-2 w-2 rounded-full bg-white" />
        ) : (
          <NavIcon name="Check" size={12} weight="bold" />
        ))}
    </span>
  );
}
