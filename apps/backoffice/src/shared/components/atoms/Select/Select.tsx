'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { useState, type ReactNode } from 'react';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

export type SelectOption = {
  value: string;
  label: string;
  /** Contenido visual opcional delante del texto (icono, estrellas…). */
  leading?: ReactNode;
  /** Texto secundario a la derecha (p. ej. un contador). */
  hint?: string;
  /** Segunda línea en gris (p. ej. el correo de un usuario). */
  description?: string;
  disabled?: boolean;
};

/** Radix no admite `value=""` en una opción: la representamos con este valor interno. */
const VACIO = '__vacio__';
const aRadix = (v: string) => (v === '' ? VACIO : v);
const deRadix = (v: string) => (v === VACIO ? '' : v);

type SelectProps = {
  options: SelectOption[];
  /** Controlado. Con `''` se marca la opción de valor vacío o, si no la hay, se ve el placeholder. */
  value?: string;
  /** No controlado (formularios con FormData). */
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  /** Para `<label htmlFor>`: el disparador es un `<button>`, que sí es etiquetable. */
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  /** Envía el valor en un `<input type="hidden">` (funciona con FormData / useActionState). */
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

/**
 * Select del backoffice (Radix). Sustituye SIEMPRE al `<select>` nativo, cuyas
 * opciones no se pueden estilar y cuya flecha cambia según el navegador.
 * - Disparador con el aspecto de `.field` (44 px en móvil) y flecha centrada.
 * - Opciones con hover, check azul en la elegida, segunda línea opcional.
 * - Teclado y lector de pantalla de Radix (flechas, type-ahead, Escape).
 */
export function Select({
  options,
  value,
  defaultValue,
  onValueChange,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
  name,
  required,
  disabled,
  placeholder,
  className,
}: SelectProps) {
  const [interno, setInterno] = useState(defaultValue ?? '');
  const actual = value ?? interno;
  const hayVacia = options.some((o) => o.value === '');
  const selected = options.find((o) => o.value === actual);

  function cambiar(v: string) {
    const real = deRadix(v);
    if (value === undefined) setInterno(real);
    onValueChange?.(real);
  }

  // Nombre de la lista desplegable: el mismo que el del disparador (aria-label,
  // aria-labelledby o el <label for> asociado, que se lee al abrir).
  const [etiquetaLista, setEtiquetaLista] = useState<string | undefined>(ariaLabel);
  function alAbrir(abierto: boolean) {
    if (!abierto || ariaLabel || ariaLabelledby || !id) return;
    const texto = document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.replace(/\*/g, '').trim();
    setEtiquetaLista(texto || undefined);
  }

  return (
    <>
      <SelectPrimitive.Root
        value={actual === '' && !hayVacia ? '' : aRadix(actual)}
        onValueChange={cambiar}
        onOpenChange={alAbrir}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          id={id}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          aria-invalid={ariaInvalid || undefined}
          aria-required={required || undefined}
          className={cn(
            'field group flex min-w-0 items-center justify-between gap-2 text-left cursor-pointer',
            'data-[state=open]:border-[var(--color-accent)] data-[state=open]:[box-shadow:var(--shadow-focus)]',
            'data-[placeholder]:text-[var(--color-muted-2)]',
            'aria-[invalid=true]:border-[var(--color-red-ink)]',
            'disabled:cursor-not-allowed disabled:opacity-60',
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {selected?.leading && <span className="flex shrink-0 items-center">{selected.leading}</span>}
            <span className="truncate">
              <SelectPrimitive.Value placeholder={placeholder}>{selected?.label}</SelectPrimitive.Value>
            </span>
          </span>
          <SelectPrimitive.Icon asChild>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--color-muted)]" aria-hidden>
              <NavIcon
                name="CaretDown"
                size={14}
                weight="bold"
                className="transition-transform duration-[var(--dur-fast)] group-data-[state=open]:rotate-180 motion-reduce:transition-none"
              />
            </span>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            aria-label={ariaLabelledby ? undefined : (ariaLabel ?? etiquetaLista)}
            aria-labelledby={ariaLabelledby}
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            className={cn(
              'z-50 min-w-[var(--radix-select-trigger-width)] max-w-[min(420px,calc(100vw-24px))] overflow-hidden',
              'max-h-[min(480px,var(--radix-select-content-available-height))]',
              'rounded-[10px] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-elevated)]',
              'motion-reduce:animate-none',
            )}
          >
            <SelectPrimitive.ScrollUpButton className="flex h-7 items-center justify-center text-[var(--color-muted)]">
              <NavIcon name="CaretUp" size={13} />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="p-1">
              {options.map((o) => (
                <SelectPrimitive.Item
                  key={o.value || VACIO}
                  value={aRadix(o.value)}
                  disabled={o.disabled}
                  className={cn(
                    'relative flex min-h-11 sm:min-h-10 cursor-pointer select-none items-center gap-2.5 rounded-[6px] py-2 pl-3 pr-9 text-[14px] text-[var(--color-ink-2)] !outline-none',
                    'data-[highlighted]:bg-[var(--color-surface-sunken)] data-[highlighted]:text-[var(--color-ink)]',
                    'data-[state=checked]:font-semibold data-[state=checked]:text-[var(--color-accent-ink)]',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  )}
                >
                  {o.leading && <span className="flex shrink-0 items-center">{o.leading}</span>}
                  <span className="flex min-w-0 flex-col">
                    <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                    {o.description && (
                      <span className="truncate text-[12.5px] font-normal text-[var(--color-muted)]">{o.description}</span>
                    )}
                  </span>
                  {o.hint && (
                    <span className="ml-auto pl-3 text-[12px] font-normal font-mono-tabular text-[var(--color-muted)]">{o.hint}</span>
                  )}
                  <SelectPrimitive.ItemIndicator className="absolute right-3 flex items-center text-[var(--color-accent)]">
                    <NavIcon name="Check" size={15} weight="bold" />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex h-7 items-center justify-center text-[var(--color-muted)]">
              <NavIcon name="CaretDown" size={13} />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {name && <input type="hidden" name={name} value={actual} />}
    </>
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
