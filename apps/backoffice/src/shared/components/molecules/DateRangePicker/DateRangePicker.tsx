'use client';

import * as Popover from '@radix-ui/react-popover';
import { forwardRef, useState, type ReactNode } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-day-picker/style.css';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

interface DateRangePickerProps {
  /** Fechas en `aaaa-mm-dd` (formato de la URL). */
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  /** id del botón, para un `<label htmlFor>` externo. */
  id?: string;
  /** Abre el calendario al montar (p. ej. tras elegir "Elegir fechas…"). */
  defaultOpen?: boolean;
  /**
   * En línea: el calendario se pinta directamente (sin botón ni popover). Para
   * usarlo dentro de otro diálogo (filtros en móvil) sin capas apiladas.
   */
  enLinea?: boolean;
  /**
   * Anclado a otro control (p. ej. el Select "Periodo"): sin botón propio; el
   * calendario cuelga de `ancla` y se abre/cierra con `abierto`. Al cerrar,
   * el foco vuelve al elemento con id `idFocoAlCerrar`.
   */
  ancla?: ReactNode;
  abierto?: boolean;
  onAbiertoChange?: (abierto: boolean) => void;
  idFocoAlCerrar?: string;
  className?: string;
}

/**
 * Selector de rango de fechas (react-day-picker en español, semana desde el
 * lunes). Botón con el resumen "12 nov 2026 – 20 nov 2026" + calendario en un
 * Popover de Radix (foco gestionado, Escape devuelve el foco al botón). El
 * calendario es una cuadrícula navegable con flechas.
 */
export function DateRangePicker({
  from,
  to,
  onChange,
  id,
  defaultOpen = false,
  enLinea = false,
  ancla,
  abierto,
  onAbiertoChange,
  idFocoAlCerrar,
  className,
}: DateRangePickerProps) {
  const [openInterno, setOpenInterno] = useState(defaultOpen);
  const open = abierto ?? openInterno;
  const setOpen = (v: boolean) => {
    if (abierto === undefined) setOpenInterno(v);
    onAbiertoChange?.(v);
  };

  if (enLinea) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <p className="m-0 text-[14px] text-[var(--color-ink-2)]" aria-live="polite">
          {resumen(from, to)}
        </p>
        <Calendario from={from} to={to} onChange={onChange} />
      </div>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {ancla ? (
        <Popover.Anchor asChild>
          <div className={className}>{ancla}</div>
        </Popover.Anchor>
      ) : (
        <Popover.Trigger asChild>
          <BotonResumen id={id} from={from} to={to} abierto={open} className={className} />
        </Popover.Trigger>
      )}
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          aria-label="Elegir fechas"
          // El foco entra en el día elegido (o en hoy), no en "mes anterior"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            enfocarDia(e.currentTarget as HTMLElement);
          }}
          // Sin botón propio (anclado): el foco vuelve al control del que cuelga
          onCloseAutoFocus={(e) => {
            if (!idFocoAlCerrar) return;
            e.preventDefault();
            document.getElementById(idFocoAlCerrar)?.focus();
          }}
          className="z-50 rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-surface)] shadow-[var(--shadow-elevated)] outline-none"
        >
          <div className="px-3 pt-3 pb-1">
            <Calendario from={from} to={to} onChange={onChange} />
            {/* Anuncia el rango elegido (como la variante en línea) */}
            <p className="sr-only" aria-live="polite">
              {resumen(from, to)}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-3 py-2">
            <button
              type="button"
              onClick={() => onChange({ from: '', to: '' })}
              className="min-h-11 sm:min-h-9 rounded-[8px] px-3 text-[14px] font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]"
            >
              Borrar fechas
            </button>
            <Popover.Close className="min-h-11 sm:min-h-9 rounded-[8px] bg-[var(--color-accent)] px-4 text-[14px] font-semibold text-white hover:bg-[var(--color-accent-hover)]">
              Listo
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const BotonResumen = forwardRef<
  HTMLButtonElement,
  { from: string; to: string; abierto: boolean; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function BotonResumen({ from, to, abierto, className, ...props }, ref) {
  const lleno = Boolean(from || to);
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={abierto}
      {...props}
      className={cn(
        'field inline-flex min-w-0 items-center justify-between gap-2 text-left cursor-pointer',
        'data-[state=open]:border-[var(--color-accent)]',
        className,
      )}
    >
      <span className={cn('truncate', lleno ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]')}>
        {lleno ? resumen(from, to) : 'Elige las fechas'}
      </span>
      <NavIcon name="CalendarBlank" size={16} className="shrink-0 text-[var(--color-muted)]" />
    </button>
  );
});

function Calendario({ from, to, onChange }: Pick<DateRangePickerProps, 'from' | 'to' | 'onChange'>) {
  const selected: DateRange | undefined =
    from || to ? { from: from ? parseYMD(from) : undefined, to: to ? parseYMD(to) : undefined } : undefined;
  return (
    <DayPicker
      mode="range"
      selected={selected}
      onSelect={(r) => onChange({ from: r?.from ? ymd(r.from) : '', to: r?.to ? ymd(r.to) : '' })}
      defaultMonth={selected?.from ?? selected?.to}
      locale={es}
      weekStartsOn={1}
      numberOfMonths={1}
      disabled={{ after: new Date() }}
      labels={{
        labelPrevious: () => 'Mes anterior',
        labelNext: () => 'Mes siguiente',
        labelNav: () => 'Cambiar de mes',
        labelGrid: (d: Date) => format(d, "MMMM 'de' y", { locale: es }),
        labelDayButton: (d: Date, m: { today?: boolean; selected?: boolean }) =>
          `${m.today ? 'Hoy, ' : ''}${format(d, "EEEE, d 'de' MMMM 'de' y", { locale: es })}${m.selected ? ', elegido' : ''}`,
      }}
      classNames={{ root: 'rdp-brand' }}
    />
  );
}

/** Enfoca el día con tabindex=0 de la cuadrícula (el elegido o hoy). */
export function enfocarDia(contenedor: HTMLElement | null) {
  const grid = contenedor?.querySelector('[role=grid]');
  (grid?.querySelector<HTMLElement>('button[tabindex="0"]') ?? grid?.querySelector<HTMLElement>('button:not([disabled])'))?.focus();
}

/**
 * Rango corto para mostrar dentro de un Select: "12–19 nov", "28 oct – 3 nov",
 * "28 dic 2025 – 3 ene 2026", "Desde el 12 nov", "Hasta el 19 nov".
 */
export function resumenCorto(from: string, to: string): string {
  const a = parseYMD(from);
  const b = parseYMD(to);
  const dm = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
  const dmy = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
  if (a && b) {
    if (a.getTime() === b.getTime()) return dm(a);
    if (a.getFullYear() !== b.getFullYear()) return `${dmy(a)} – ${dmy(b)}`;
    if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${dm(b)}`;
    return `${dm(a)} – ${dm(b)}`;
  }
  if (a) return `Desde el ${dm(a)}`;
  if (b) return `Hasta el ${dm(b)}`;
  return '';
}

/** "12 nov 2026 – 20 nov 2026", "Desde el 12 nov 2026", "Hasta el 20 nov 2026". */
function resumen(from: string, to: string): string {
  if (from && to) return from === to ? bonita(from) : `${bonita(from)} – ${bonita(to)}`;
  if (from) return `Desde el ${bonita(from)}`;
  if (to) return `Hasta el ${bonita(to)}`;
  return 'Sin fechas elegidas';
}

function bonita(s: string): string {
  const d = parseYMD(s);
  return d ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : s;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseYMD(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
}
