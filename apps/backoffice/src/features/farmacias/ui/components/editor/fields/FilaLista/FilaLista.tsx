'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

const ITEM =
  'flex w-full min-h-11 items-center gap-2.5 px-3 rounded-[6px] text-[14px] text-[var(--color-ink)] outline-none cursor-pointer data-[highlighted]:bg-[var(--color-surface-sunken)] data-[disabled]:opacity-40 data-[disabled]:cursor-default';

/**
 * Fila de una lista ordenable del editor (servicios, preguntas, puntos
 * fuertes, tarjetas). Toda la fila abre "Editar".
 * - Escritorio: asa para arrastrar + Editar + Eliminar visibles.
 * - Móvil: un único botón "⋯" de 44 px con Editar / Subir / Bajar / Eliminar
 *   (arrastrar con el dedo desde un asa pequeña era casi imposible).
 */
export function FilaLista({
  id,
  indice,
  total,
  tipo,
  titulo,
  detalle,
  icono,
  aviso,
  destacar = false,
  onEdit,
  onRemove,
  onMove,
}: {
  id: string;
  indice: number;
  total: number;
  /** "servicio", "pregunta"… para los nombres accesibles. */
  tipo: string;
  /** Texto principal (vacío → "Sin título"). */
  titulo: string;
  detalle?: string;
  icono?: ReactNode;
  /** Aviso bajo el título (p. ej. "Falta traducir al inglés"). */
  aviso?: ReactNode;
  /** Recién añadida: se resalta y se lleva a la vista. */
  destacar?: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onMove: (delta: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const ref = useRef<HTMLLIElement | null>(null);
  const nombre = titulo.trim() || `${tipo[0].toUpperCase()}${tipo.slice(1)} sin título`;

  useEffect(() => {
    if (destacar) ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [destacar]);

  return (
    <li
      ref={(el) => {
        setNodeRef(el);
        ref.current = el;
      }}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={cn(
        'flex items-center gap-1 sm:gap-2 pl-1 pr-1 sm:px-2 py-1.5 rounded-[var(--radius-sm)] border bg-[var(--color-surface)] transition-colors',
        destacar ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-transparent hover:border-[var(--color-hairline)]',
        isDragging && 'border-[var(--color-hairline-strong)] shadow-[var(--shadow-elevated)]',
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Mover «${nombre}» (arrastra o usa las flechas)`}
        className="hidden sm:flex shrink-0 h-8 w-8 items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] cursor-pointer active:cursor-grabbing"
      >
        <NavIcon name="DotsSixVertical" size={14} weight="bold" />
      </button>

      <button
        type="button"
        onClick={onEdit}
        data-foco-tras-modal={destacar ? '' : undefined}
        className="flex-1 min-w-0 min-h-11 flex items-center gap-3 px-2 sm:px-0 py-1 text-left rounded-[6px]"
      >
        {icono && <span className="shrink-0">{icono}</span>}
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-[14px] font-medium leading-snug line-clamp-2',
              titulo.trim() ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)] italic',
            )}
          >
            {nombre}
          </span>
          {detalle && (
            <span className="hidden sm:block text-[13px] text-[var(--color-muted)] truncate leading-tight mt-0.5">
              {detalle}
            </span>
          )}
          {aviso}
        </span>
        <span className="sr-only">. Editar</span>
      </button>

      {/* Escritorio */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Editar «${nombre}»`}
        className="hidden sm:flex shrink-0 h-8 w-8 items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]"
      >
        <NavIcon name="PencilSimple" size={14} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Eliminar «${nombre}»`}
        className="hidden sm:flex shrink-0 h-8 w-8 items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)]"
      >
        <NavIcon name="Trash" size={14} />
      </button>

      {/* Móvil */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label={`Opciones de «${nombre}»`}
          className="sm:hidden shrink-0 h-11 w-11 flex items-center justify-center rounded-[8px] text-[var(--color-muted)] hover:bg-[var(--color-surface-sunken)]"
        >
          <NavIcon name="DotsThree" size={20} weight="bold" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 min-w-[200px] rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-elevated)]"
          >
            <DropdownMenu.Item className={ITEM} onSelect={onEdit}>
              <NavIcon name="PencilSimple" size={16} className="text-[var(--color-muted)]" />
              Editar
            </DropdownMenu.Item>
            <DropdownMenu.Item className={ITEM} disabled={indice === 0} onSelect={() => onMove(-1)}>
              <NavIcon name="ArrowUp" size={16} className="text-[var(--color-muted)]" />
              Subir
            </DropdownMenu.Item>
            <DropdownMenu.Item className={ITEM} disabled={indice === total - 1} onSelect={() => onMove(1)}>
              <NavIcon name="ArrowDown" size={16} className="text-[var(--color-muted)]" />
              Bajar
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="my-1 h-px bg-[var(--color-hairline)]" />
            <DropdownMenu.Item className={cn(ITEM, 'text-[var(--color-red-ink)]')} onSelect={onRemove}>
              <NavIcon name="Trash" size={16} />
              Eliminar
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </li>
  );
}

/** Texto de aviso de traducción pendiente bajo el título de una fila. */
export function AvisoTraduccion({ idiomas }: { idiomas: string[] }) {
  if (idiomas.length === 0) return null;
  return (
    <span className="mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] text-[var(--color-yellow-ink)]">
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-yellow-ink)]" />
      Falta traducir al {idiomas.join(' y al ')}
    </span>
  );
}
