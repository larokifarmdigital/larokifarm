import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { IndicadorEleccion } from '../IndicadorEleccion';

/**
 * Fila de elección (checkbox o radio) para formularios: sin borde ni relleno;
 * solo el indicador se pone azul al marcarla. Toda la fila es la zona de clic
 * (44 px en móvil) y el anillo de foco se pinta en la fila. El input real va
 * `sr-only` dentro del <label>.
 */
export function OpcionEleccion({
  tipo,
  marcado,
  onChange,
  titulo,
  descripcion,
  desactivado = false,
  id,
  name,
  value,
}: {
  tipo: 'checkbox' | 'radio';
  marcado: boolean;
  onChange: () => void;
  titulo: ReactNode;
  /** Segunda línea en gris (opcional). */
  descripcion?: ReactNode;
  desactivado?: boolean;
  id?: string;
  name?: string;
  value?: string;
}) {
  return (
    <label
      className={cn(
        '-mx-2 flex gap-3 rounded-[8px] px-2 min-h-11 sm:min-h-9 hover:bg-[var(--color-surface-2)]',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--color-accent)] has-[:focus-visible]:outline-offset-0',
        descripcion ? 'items-start py-1.5' : 'items-center',
        desactivado ? 'cursor-not-allowed opacity-60 hover:bg-transparent' : 'cursor-pointer',
      )}
    >
      <input
        type={tipo}
        id={id}
        name={name}
        value={value}
        checked={marcado}
        disabled={desactivado}
        onChange={onChange}
        className="sr-only"
      />
      <IndicadorEleccion tipo={tipo} marcado={marcado} desactivado={desactivado} />
      <span className="min-w-0">
        <span className="block text-[14.5px] text-[var(--color-ink)]">{titulo}</span>
        {descripcion && <span className="block text-[13px] leading-[1.4] text-[var(--color-muted)]">{descripcion}</span>}
      </span>
    </label>
  );
}
