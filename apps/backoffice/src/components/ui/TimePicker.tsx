'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

const HORAS = Array.from({ length: 24 }, (_, i) => i);

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function parse(v: string): { h: number; m: number } {
  const [hStr, mStr] = (v || '').split(':');
  const h = Math.max(0, Math.min(23, parseInt(hStr ?? '0', 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(mStr ?? '0', 10) || 0));
  return { h, m };
}

/**
 * Input de hora tipo iOS: un botón compacto muestra `HH:MM` en mono; al click abre
 * un popover con dos columnas scrollables (Hora / Minuto). El valor se emite en
 * formato `HH:MM` (24h). Sin librería externa, apoyado en Radix Popover.
 */
export function TimePicker({
  value,
  onChange,
  minuteStep = 15,
  className,
  ariaLabel,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Incremento entre minutos en la columna (default 15). */
  minuteStep?: 5 | 10 | 15 | 30;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const MINUTOS = useMemo(
    () => Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep),
    [minuteStep],
  );
  const { h, m } = parse(value);
  const emit = (hh: number, mm: number) => onChange(`${pad(hh)}:${pad(mm)}`);
  // Al elegir un minuto que no está en el step, snap al más cercano visualmente
  const activeMinuto = MINUTOS.includes(m)
    ? m
    : MINUTOS.reduce((prev, curr) => (Math.abs(curr - m) < Math.abs(prev - m) ? curr : prev), MINUTOS[0]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel ?? `Hora ${value || '--:--'}`}
          className={cn(
            'inline-flex items-center justify-center gap-1 h-9 w-[92px] rounded-[var(--radius-sm)] border border-[var(--color-hairline)] bg-[var(--color-surface)] font-mono-tabular text-[13.5px] tabular-nums text-[var(--color-ink)] transition-[border-color,box-shadow] duration-[var(--dur-fast)]',
            'hover:border-[var(--color-hairline-strong)]',
            'focus:outline-none focus-visible:border-[var(--color-accent)] focus-visible:[box-shadow:var(--shadow-focus)]',
            'data-[state=open]:!border-[var(--color-accent)] data-[state=open]:[box-shadow:var(--shadow-focus)]',
            'disabled:opacity-55 disabled:cursor-not-allowed',
            className,
          )}
        >
          {value || '--:--'}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="z-50 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-hairline)] shadow-[var(--shadow-elevated)] p-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <div className="flex items-stretch gap-2">
            <ScrollColumn
              label="Hora"
              items={HORAS}
              activeValue={h}
              onSelect={(hh) => emit(hh, activeMinuto)}
              openTick={open}
            />
            <div className="w-px bg-[var(--color-hairline)]" aria-hidden />
            <ScrollColumn
              label="Min"
              items={MINUTOS}
              activeValue={activeMinuto}
              onSelect={(mm) => emit(h, mm)}
              openTick={open}
            />
          </div>
          <Popover.Arrow className="fill-[var(--color-surface)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ScrollColumn({
  label,
  items,
  activeValue,
  onSelect,
  openTick,
}: {
  label: string;
  items: number[];
  activeValue: number;
  onSelect: (v: number) => void;
  openTick: boolean;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Al abrir el popover o cambiar el valor activo, centrar la selección.
    if (openTick) {
      // Delay hasta el próximo frame para que el popover haya montado
      requestAnimationFrame(() => {
        activeRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
      });
    }
  }, [openTick, activeValue]);

  return (
    <div className="flex flex-col items-center min-w-[54px]">
      <p className="text-[9.5px] font-mono-tabular uppercase tracking-[0.08em] text-[var(--color-muted-2)] text-center py-1 m-0 select-none">
        {label}
      </p>
      <div
        role="listbox"
        aria-label={label}
        className="scrollbar-thin h-[168px] w-full overflow-y-auto scroll-py-[70px]"
      >
        {items.map((n) => {
          const active = n === activeValue;
          return (
            <button
              key={n}
              ref={active ? activeRef : undefined}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(n)}
              className={cn(
                'w-full h-8 flex items-center justify-center rounded-[6px] text-[13px] font-mono-tabular tabular-nums transition-colors',
                active
                  ? 'bg-[var(--color-accent)] text-white font-medium'
                  : 'text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]',
              )}
            >
              {pad(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
