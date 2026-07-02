'use client';

import { useEffect, useRef, useState } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import { es } from 'date-fns/locale';
import 'react-day-picker/style.css';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (range: { from: string; to: string }) => void;
  fromLabel?: string;
  toLabel?: string;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  fromLabel = 'Desde',
  toLabel = 'Hasta',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const selected: DateRange | undefined =
    from || to
      ? {
          from: from ? parseYMD(from) : undefined,
          to: to ? parseYMD(to) : undefined,
        }
      : undefined;

  function handleSelect(range: DateRange | undefined) {
    onChange({
      from: range?.from ? ymd(range.from) : '',
      to: range?.to ? ymd(range.to) : '',
    });
  }

  const summary = summarize(from, to, fromLabel, toLabel);

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-left text-sm hover:border-slate-400 focus:border-transparent focus:outline-none focus:ring-2"
        style={{
          ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
        }}
        aria-expanded={open}
      >
        <span
          className={`min-w-0 flex-1 truncate ${summary.filled ? 'font-medium text-slate-900' : 'text-slate-400'}`}
        >
          {summary.label}
        </span>
        <CalendarIcon />
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-2 inline-block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="px-3 pt-2 pb-1">
            <DayPicker
              mode="range"
              selected={selected}
              onSelect={handleSelect}
              locale={es}
              numberOfMonths={1}
              weekStartsOn={1}
              classNames={{
                root: 'rdp-brand',
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs">
            <button
              type="button"
              onClick={() => onChange({ from: '', to: '' })}
              className="rounded-md px-3 py-1 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-1 font-medium text-white"
              style={{ background: 'var(--brand-primary)' }}
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function summarize(
  from: string,
  to: string,
  fromLabel: string,
  toLabel: string,
): { label: string; filled: boolean } {
  if (from && to) {
    if (from === to) return { label: prettyDate(from), filled: true };
    return { label: `${prettyDate(from)} — ${prettyDate(to)}`, filled: true };
  }
  if (from) return { label: `${prettyDate(from)} — ${toLabel}`, filled: true };
  if (to) return { label: `${fromLabel} — ${prettyDate(to)}`, filled: true };
  return { label: `${fromLabel} — ${toLabel}`, filled: false };
}

function prettyDate(ymdStr: string): string {
  const d = parseYMD(ymdStr);
  if (!d) return ymdStr;
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseYMD(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-slate-400"
      aria-hidden
    >
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
