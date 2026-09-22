'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { TimePicker } from '@/components/ui/TimePicker';
import { NavIcon } from '@/features/shell/NavIcon';
import { cn } from '@/lib/utils';
import type { Horario } from '@/types/content';

const DIAS: { key: Horario['dia']; label: string; short: string }[] = [
  { key: 'lun', label: 'Lunes', short: 'Lun' },
  { key: 'mar', label: 'Martes', short: 'Mar' },
  { key: 'mie', label: 'Miércoles', short: 'Mié' },
  { key: 'jue', label: 'Jueves', short: 'Jue' },
  { key: 'vie', label: 'Viernes', short: 'Vie' },
  { key: 'sab', label: 'Sábado', short: 'Sáb' },
  { key: 'dom', label: 'Domingo', short: 'Dom' },
];

function ensureAllDays(horarios: Horario[]): Horario[] {
  return DIAS.map(
    ({ key }) => horarios.find((h) => h.dia === key) ?? { dia: key, tramos: [], cerrado: true },
  );
}

function summarize(h: Horario): string {
  if (h.cerrado) return 'Cerrado';
  if (h.tramos.length === 0) return 'Sin tramos';
  return h.tramos.map((t) => `${t.abre}–${t.cierra}`).join(' · ');
}

/** Duración de un tramo en minutos, tolerando cruce de medianoche. */
function durationMinutes(abre: string, cierra: string): number {
  const [ah, am] = abre.split(':').map((n) => parseInt(n, 10) || 0);
  const [ch, cm] = cierra.split(':').map((n) => parseInt(n, 10) || 0);
  const start = ah * 60 + am;
  const end = ch * 60 + cm;
  return end >= start ? end - start : 24 * 60 - start + end;
}

/** Convierte minutos a formato humano "5h" o "4h 30min". */
function humanDuration(mins: number): string {
  if (mins <= 0) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function HorarioSemanal({
  horarios,
  onChange,
}: {
  horarios: Horario[];
  onChange: (next: Horario[]) => void;
}) {
  const [expandedDia, setExpandedDia] = useState<Horario['dia'] | null>(null);
  const reduced = useReducedMotion();
  const dias = ensureAllDays(horarios);

  const updateDia = (dia: Horario['dia'], next: Partial<Horario>) => {
    onChange(dias.map((h) => (h.dia === dia ? { ...h, ...next } : h)));
  };

  const toggleAbierto = (h: Horario) => {
    updateDia(h.dia, {
      cerrado: !h.cerrado,
      tramos: h.cerrado ? [{ abre: '09:00', cierra: '14:00' }] : [],
    });
  };

  const copyFrom = (target: Horario['dia'], source: Horario['dia']) => {
    const src = dias.find((d) => d.dia === source);
    if (!src) return;
    updateDia(target, { cerrado: src.cerrado, tramos: src.tramos.map((t) => ({ ...t })) });
  };

  return (
    <div className="card overflow-hidden">
      {dias.map((h, i) => {
        const dia = DIAS[i];
        const isExpanded = expandedDia === h.dia;
        return (
          <div key={h.dia} className={cn(i > 0 && 'border-t border-[var(--color-hairline)]')}>
            <button
              type="button"
              onClick={() => setExpandedDia(isExpanded ? null : h.dia)}
              aria-expanded={isExpanded}
              className={cn(
                'w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 text-left transition-colors',
                'hover:bg-[var(--color-surface-2)]',
                isExpanded && 'bg-[var(--color-surface-2)]',
              )}
            >
              <span className="w-9 sm:w-12 shrink-0 text-[13px] sm:text-[14px] font-medium text-[var(--color-ink)]">
                <span className="sm:hidden">{dia.short}</span>
                <span className="hidden sm:inline">{dia.label}</span>
              </span>
              <span
                className={cn(
                  'flex-1 min-w-0 truncate text-[13px] font-mono-tabular',
                  h.cerrado ? 'text-[var(--color-muted)] italic font-sans' : 'text-[var(--color-ink-2)]',
                )}
              >
                {summarize(h)}
              </span>
              <span
                className={cn(
                  'shrink-0 inline-flex items-center justify-center h-5 px-2 rounded-full text-[10.5px] font-mono-tabular tracking-wider uppercase',
                  h.cerrado
                    ? 'bg-[var(--color-surface-sunken)] text-[var(--color-muted)]'
                    : 'bg-[var(--color-green-soft)] text-[var(--color-green-ink)]',
                )}
                aria-hidden
              >
                <span
                  className={cn(
                    'inline-block h-1.5 w-1.5 rounded-full mr-1',
                    h.cerrado ? 'bg-[var(--color-muted-2)]' : 'bg-[var(--color-green-ink)]',
                  )}
                />
                {h.cerrado ? 'Cerrado' : 'Abierto'}
              </span>
              <span className="shrink-0 text-[var(--color-muted-2)]" aria-hidden>
                <NavIcon
                  name="CaretDown"
                  size={12}
                  className={cn('transition-transform', isExpanded && 'rotate-180')}
                />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="content"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={reduced ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: reduced ? 0.1 : 0.22, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-4 sm:px-5 pb-4 pt-1 flex flex-col gap-3">
                    {/* Toggle abierto / cerrado */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={h.cerrado ? 'accent' : 'secondary'}
                        size="sm"
                        onClick={() => toggleAbierto(h)}
                      >
                        <NavIcon name={h.cerrado ? 'Plus' : 'X'} size={12} />
                        {h.cerrado ? 'Abrir el día' : 'Marcar como cerrado'}
                      </Button>

                      <CopyFromMenu
                        dias={dias}
                        currentDia={h.dia}
                        onCopy={(src) => copyFrom(h.dia, src)}
                      />
                    </div>

                    {/* Tramos */}
                    {!h.cerrado && (
                      <div className="flex flex-col gap-2">
                        {h.tramos.length === 0 && (
                          <p className="text-[12px] text-[var(--color-muted-2)] italic m-0 py-2">
                            Sin tramos añadidos. Pulsa «Añadir tramo» para configurar el horario.
                          </p>
                        )}
                        {h.tramos.map((t, ti) => {
                          const dur = humanDuration(durationMinutes(t.abre, t.cierra));
                          return (
                            <div
                              key={ti}
                              className="rounded-[var(--radius-md)] border border-[var(--color-hairline)] bg-[var(--color-surface)] p-3"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-mono-tabular text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-muted-2)]">
                                  Tramo {ti + 1}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11.5px] text-[var(--color-muted)] font-mono-tabular tabular-nums">
                                    {dur}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateDia(h.dia, {
                                        tramos: h.tramos.filter((_, x) => x !== ti),
                                      })
                                    }
                                    aria-label={`Eliminar tramo ${ti + 1}`}
                                    className="inline-flex items-center gap-1 h-6 pl-1.5 pr-2 rounded-full text-[11px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)] transition-colors"
                                  >
                                    <NavIcon name="Trash" size={11} />
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-end gap-3 flex-wrap">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10.5px] font-mono-tabular uppercase tracking-[0.08em] text-[var(--color-muted-2)] select-none">
                                    Abre
                                  </label>
                                  <TimePicker
                                    value={t.abre}
                                    onChange={(v) => {
                                      const tramos = [...h.tramos];
                                      tramos[ti] = { ...tramos[ti], abre: v };
                                      updateDia(h.dia, { tramos });
                                    }}
                                    ariaLabel={`Hora de apertura tramo ${ti + 1}`}
                                  />
                                </div>
                                <span
                                  aria-hidden
                                  className="pb-2 text-[var(--color-muted-2)] text-[13px] font-mono-tabular"
                                >
                                  →
                                </span>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10.5px] font-mono-tabular uppercase tracking-[0.08em] text-[var(--color-muted-2)] select-none">
                                    Cierra
                                  </label>
                                  <TimePicker
                                    value={t.cierra}
                                    onChange={(v) => {
                                      const tramos = [...h.tramos];
                                      tramos[ti] = { ...tramos[ti], cierra: v };
                                      updateDia(h.dia, { tramos });
                                    }}
                                    ariaLabel={`Hora de cierre tramo ${ti + 1}`}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {h.tramos.length < 2 && (
                          <button
                            type="button"
                            onClick={() =>
                              updateDia(h.dia, {
                                tramos: [
                                  ...h.tramos,
                                  h.tramos.length === 0
                                    ? { abre: '09:00', cierra: '14:00' }
                                    : { abre: '17:00', cierra: '20:30' },
                                ],
                              })
                            }
                            className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-[var(--radius-md)] border border-dashed border-[var(--color-hairline-strong)] text-[12.5px] text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-colors"
                          >
                            <NavIcon name="Plus" size={12} />
                            Añadir tramo
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function CopyFromMenu({
  dias,
  currentDia,
  onCopy,
}: {
  dias: Horario[];
  currentDia: Horario['dia'];
  onCopy: (source: Horario['dia']) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = dias.filter((d) => d.dia !== currentDia && (d.tramos.length > 0 || d.cerrado));

  if (options.length === 0) return null;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <NavIcon name="Copy" size={12} />
        Copiar de…
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute left-0 top-full mt-1 z-40 min-w-[180px] bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[8px] shadow-[var(--shadow-elevated)] p-1"
          >
            {options.map((d) => {
              const info = DIAS.find((x) => x.key === d.dia)!;
              return (
                <button
                  key={d.dia}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    onCopy(d.dia);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between gap-3 px-2.5 py-1.5 rounded-[4px] text-[12.5px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] cursor-pointer"
                >
                  <span>{info.label}</span>
                  <span className="text-[10.5px] font-mono-tabular text-[var(--color-muted-2)] truncate max-w-[110px]">
                    {summarize(d)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
