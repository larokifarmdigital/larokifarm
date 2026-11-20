'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/shared/lib/cn';

/** Interruptor on/off (Radix). Accesible: role="switch" + aria-checked. */
export function Switch({
  checked,
  onCheckedChange,
  id,
  disabled,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      // El botón mide 44px en móvil (zona táctil); el carril visible sigue siendo 38×22.
      className={cn(
        'group relative inline-flex h-11 w-12 sm:h-6 sm:w-10 shrink-0 cursor-pointer items-center justify-center rounded-full',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'relative inline-flex h-[22px] w-[38px] items-center rounded-full transition-colors duration-[var(--dur-fast)]',
          // Apagado: borde con contraste 3:1 (WCAG 1.4.11)
          checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-control-border)]',
        )}
      >
        <SwitchPrimitive.Thumb className="block h-[18px] w-[18px] translate-x-[2px] rounded-full bg-white shadow-sm transition-transform duration-[var(--dur-fast)] data-[state=checked]:translate-x-[18px]" />
      </span>
    </SwitchPrimitive.Root>
  );
}
