'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import type { ReactNode } from 'react';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

export type SelectOption = {
  value: string;
  label: string;
  /** Contenido visual opcional delante del texto (icono, estrellas…). */
  leading?: ReactNode;
  /** Texto secundario a la derecha (p. ej. un contador). */
  hint?: string;
};

/**
 * Select propio (Radix): mismo aspecto que Input en el disparador y
 * opciones con estilo del design system (hover, check en la seleccionada,
 * iconos). Accesible: teclado, type-ahead, aria-*, y en móvil se comporta
 * como popover.
 */
export function Select({
  value,
  onValueChange,
  options,
  'aria-label': ariaLabel,
  disabled,
  className,
  placeholder,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: SelectOption[];
  'aria-label': string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={ariaLabel}
        className={cn(
          'field group inline-flex min-w-0 items-center justify-between gap-2 text-left cursor-pointer',
          'data-[state=open]:border-[var(--color-accent)] data-[state=open]:[box-shadow:var(--shadow-focus)]',
          'disabled:cursor-not-allowed disabled:opacity-60',
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.leading && <span className="flex shrink-0 items-center">{selected.leading}</span>}
          <span className="truncate">
            <SelectPrimitive.Value placeholder={placeholder}>{selected?.label}</SelectPrimitive.Value>
          </span>
        </span>
        <SelectPrimitive.Icon asChild>
          <NavIcon
            name="CaretDown"
            size={12}
            className="shrink-0 text-[var(--color-muted)] transition-transform duration-[var(--dur-fast)] group-data-[state=open]:rotate-180"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'z-50 min-w-[var(--radix-select-trigger-width)] max-h-[var(--radix-select-content-available-height)] overflow-hidden',
            'rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-elevated)]',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                className={cn(
                  'relative flex cursor-pointer select-none items-center gap-2 rounded-[6px] py-2 pl-2.5 pr-8 text-[13px] text-[var(--color-ink-2)] !outline-none',
                  'data-[highlighted]:bg-[var(--color-surface-sunken)] data-[highlighted]:text-[var(--color-ink)]',
                  'data-[state=checked]:font-medium data-[state=checked]:text-[var(--color-ink)]',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                )}
              >
                {o.leading && <span className="flex shrink-0 items-center">{o.leading}</span>}
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                {o.hint && <span className="ml-auto pl-3 text-[11.5px] font-mono-tabular text-[var(--color-muted-2)]">{o.hint}</span>}
                <SelectPrimitive.ItemIndicator className="absolute right-2.5 flex items-center text-[var(--color-accent)]">
                  <NavIcon name="Check" size={13} weight="bold" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

/** Fila de 5 estrellas (llenas hasta `n`) para usar como `leading` de una opción. */
export function StarsLeading({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center gap-[1px]" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <NavIcon
          key={i}
          name="Star"
          size={12}
          weight="fill"
          className={i <= n ? 'text-[#f5a623]' : 'text-[var(--color-hairline-strong)]'}
        />
      ))}
    </span>
  );
}
