'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export type IconInputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon: ReactNode;
  label: string;
  prefix?: string;
  suffix?: ReactNode;
  invalid?: boolean;
  bare?: boolean;
};

export const IconInput = forwardRef<HTMLInputElement, IconInputProps>(
  ({ icon, label, prefix, suffix, invalid, bare, className, ...props }, ref) => {
    return (
      <Tooltip.Root delayDuration={400}>
        <div
          className={cn(
            'group flex items-stretch rounded-[var(--radius-sm)] transition-[border-color,box-shadow] duration-[var(--dur-fast)]',
            // `!` (important) en focus-within para que gane a hover cuando el input recibe foco:
            // Tailwind puede ordenar hover:*  después de focus-within:* en el CSS compilado,
            // haciendo que el border amarillo del hover mate al border naranja del foco.
            !bare && 'bg-[var(--color-surface)] border border-[var(--color-hairline)] hover:border-[var(--color-hairline-strong)] focus-within:!border-[var(--color-accent)] focus-within:[box-shadow:var(--shadow-focus)]',
            bare && 'bg-transparent focus-within:bg-[var(--color-surface-2)]',
            invalid && !bare && 'border-[var(--color-red-ink)] focus-within:!border-[var(--color-red-ink)]',
          )}
        >
          <Tooltip.Trigger asChild>
            <span
              className="flex items-center justify-center pl-3 pr-2 text-[var(--color-muted)] group-focus-within:text-[var(--color-accent)] transition-colors shrink-0"
              aria-hidden
            >
              {icon}
            </span>
          </Tooltip.Trigger>
          {prefix && (
            <span className="flex items-center pl-1 pr-1 text-[12.5px] font-mono-tabular text-[var(--color-muted)] shrink-0">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            aria-label={label}
            aria-invalid={invalid || undefined}
            // Inline style neutraliza el outline global de :focus-visible (globals.css
            // aplica `outline: 2px solid var(--color-accent)` a todos los inputs). Aquí
            // el foco lo indica el wrapper, así el naranja envuelve icono + input como
            // un único bloque en vez de dibujarse solo alrededor del input.
            style={{ outline: 'none' }}
            className={cn(
              'flex-1 min-w-0 bg-transparent border-0 text-[13.5px] py-2 pl-0 pr-3 text-[var(--color-ink)] placeholder:text-[var(--color-muted-2)]',
              className,
            )}
            {...props}
          />
          {suffix && (
            <span className="flex items-center pr-2 text-[var(--color-muted-2)] shrink-0">{suffix}</span>
          )}
        </div>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={4}
            className="z-50 bg-[var(--color-ink)] text-[var(--color-surface)] text-[11.5px] px-2 py-1 rounded-[4px] shadow-[var(--shadow-elevated)]"
          >
            {label}
            <Tooltip.Arrow className="fill-[var(--color-ink)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  },
);
IconInput.displayName = 'IconInput';
