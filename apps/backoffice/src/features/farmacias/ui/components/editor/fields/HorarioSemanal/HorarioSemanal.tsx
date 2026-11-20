'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from '@/shared/components/atoms/Button';
import { Switch } from '@/shared/components/atoms/Switch';
import { TimePicker } from '@/shared/components/molecules/TimePicker';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import { tramoError, type Horario } from '@/core/farmacias/domain';

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
  if (h.tramos.length === 0) return 'Sin horas';
  const txt = h.tramos.map((t) => `${t.abre}–${t.cierra}`).join(' · ');
  return h.tramos.some((t, i) => tramoIssue(t, h.tramos[i - 1])) ? `${txt} ⚠` : txt;
}

/** Duración de un tramo en minutos, tolerando cruce de medianoche. */
function durationMinutes(abre: string, cierra: string): number {
  const [ah, am] = abre.split(':').map((n) => parseInt(n, 10) || 0);
  const [ch, cm] = cierra.split(':').map((n) => parseInt(n, 10) || 0);
  const start = ah * 60 + am;
  const end = ch * 60 + cm;
  return end >= start ? end - start : 24 * 60 - start + end;
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
};

/**
 * Error (bloquea publicar, regla compartida en core) o aviso (cierre antes de
 * apertura: válido si el tramo cruza la medianoche, p. ej. farmacia de guardia).
 */
function tramoIssue(
  t: { abre: string; cierra: string },
  prev?: { abre: string; cierra: string },
): { level: 'error' | 'warning'; message: string } | null {
  const error = tramoError(t, prev);
  if (error) return { level: 'error', message: error };
  if (toMin(t.cierra) < toMin(t.abre)) {
    return { level: 'warning', message: 'Cierra antes de abrir: solo es correcto si el tramo cruza la medianoche.' };
  }
  return null;
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

  const setAbierto = (h: Horario, abierto: boolean) => {
    updateDia(h.dia, {
      cerrado: !abierto,
      tramos: abierto ? [{ abre: '09:00', cierra: '14:00' }] : [],
    });
    // Al abrir un día se despliega para ajustar las horas
    setExpandedDia(abierto ? h.dia : null);
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
            <div className={cn('flex items-center gap-2 pr-3 sm:pr-4', isExpanded && 'bg-[var(--color-surface-2)]')}>
            <button
              type="button"
              onClick={() => setExpandedDia(isExpanded ? null : h.dia)}
              aria-expanded={isExpanded}
              disabled={h.cerrado}
              aria-label={`${dia.label}: ${summarize(h)}. ${isExpanded ? 'Ocultar' : 'Cambiar'} horas`}
              className={cn(
                'flex-1 min-w-0 min-h-14 flex items-center gap-3 sm:gap-4 pl-4 sm:pl-5 pr-2 py-3 text-left transition-colors',
                'hover:bg-[var(--color-surface-2)] disabled:hover:bg-transparent disabled:cursor-default',
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
              {!h.cerrado && (
                <span className="shrink-0 text-[var(--color-muted)]" aria-hidden>
                  <NavIcon
                    name="CaretDown"
                    size={12}
                    className={cn('transition-transform', isExpanded && 'rotate-180')}
                  />
                </span>
              )}
            </button>
            {/* Abierto/Cerrado visible sin desplegar */}
            <label className="flex shrink-0 items-center gap-2 text-[13px] text-[var(--color-ink-2)]">
              <span className="hidden sm:inline w-[58px] text-right" aria-hidden>{h.cerrado ? 'Cerrado' : 'Abierto'}</span>
              <Switch
                checked={!h.cerrado}
                onCheckedChange={(v) => setAbierto(h, v)}
                aria-label={`${dia.label} abierto`}
              />
            </label>
            </div>

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
                    <div className="flex items-center gap-2">
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
                          <p className="text-[13px] text-[var(--color-muted)] m-0 py-2">
                            Aún no hay horas. Pulsa «Añadir horario».
                          </p>
                        )}
                        {h.tramos.map((t, ti) => {
                          const dur = humanDuration(durationMinutes(t.abre, t.cierra));
                          const issue = tramoIssue(t, h.tramos[ti - 1]);
                          return (
                            <div
                              key={ti}
                              className={cn(
                                'rounded-[var(--radius-md)] border bg-[var(--color-surface)] p-3',
                                issue?.level === 'error'
                                  ? 'border-[var(--color-red-ink)]'
                                  : issue
                                    ? 'border-[var(--color-yellow-ink)]'
                                    : 'border-[var(--color-hairline)]',
                              )}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[13px] font-medium text-[var(--color-ink-2)]">
                                  {ti === 0 ? 'Primer horario' : 'Segundo horario'}
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
                                    aria-label={`Quitar el ${ti === 0 ? 'primer' : 'segundo'} horario del ${dia.label.toLowerCase()}`}
                                    className="inline-flex items-center gap-1 h-11 sm:h-7 pl-1.5 pr-2 rounded-full text-[12px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)] transition-colors"
                                  >
                                    <NavIcon name="Trash" size={11} />
                                    Quitar
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-end gap-3 flex-wrap">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[12.5px] text-[var(--color-muted)] select-none">
                                    Abre
                                  </span>
                                  <TimePicker
                                    value={t.abre}
                                    onChange={(v) => {
                                      const tramos = [...h.tramos];
                                      tramos[ti] = { ...tramos[ti], abre: v };
                                      updateDia(h.dia, { tramos });
                                    }}
                                    ariaLabel={`${dia.label}, ${ti === 0 ? 'primer' : 'segundo'} horario: abre`}
                                  />
                                </div>
                                <span
                                  aria-hidden
                                  className="pb-2 text-[var(--color-muted-2)] text-[13px] font-mono-tabular"
                                >
                                  →
                                </span>
                                <div className="flex flex-col gap-1">
                                  <span className="text-[12.5px] text-[var(--color-muted)] select-none">
                                    Cierra
                                  </span>
                                  <TimePicker
                                    value={t.cierra}
                                    onChange={(v) => {
                                      const tramos = [...h.tramos];
                                      tramos[ti] = { ...tramos[ti], cierra: v };
                                      updateDia(h.dia, { tramos });
                                    }}
                                    ariaLabel={`${dia.label}, ${ti === 0 ? 'primer' : 'segundo'} horario: cierra`}
                                  />
                                </div>
                              </div>
                              {issue && (
                                <p
                                  role="alert"
                                  className={cn(
                                    'mt-2 mb-0 flex items-center gap-1.5 text-[12px]',
                                    issue.level === 'error' ? 'text-[var(--color-red-ink)]' : 'text-[var(--color-yellow-ink)]',
                                  )}
                                >
                                  <NavIcon name="Warning" size={12} />
                                  {issue.message}
                                </p>
                              )}
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
                            className="w-full inline-flex items-center justify-center gap-1.5 h-11 sm:h-9 rounded-[var(--radius-md)] border border-dashed border-[var(--color-control-border)] text-[13px] text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-colors"
                          >
                            <NavIcon name="Plus" size={12} />
                            {h.tramos.length === 0 ? 'Añadir horario' : 'Añadir horario de tarde'}
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
  const options = dias.filter((d) => d.dia !== currentDia && (d.tramos.length > 0 || d.cerrado));

  if (options.length === 0) return null;

  // Radix DropdownMenu: flechas, Escape, foco dentro y retorno de foco al botón.
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button type="button" variant="ghost" size="sm">
          <NavIcon name="Copy" size={12} />
          Copiar de…
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className="z-50 min-w-[200px] bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[8px] shadow-[var(--shadow-elevated)] p-1"
        >
          {options.map((d) => {
            const info = DIAS.find((x) => x.key === d.dia)!;
            return (
              <DropdownMenu.Item
                key={d.dia}
                onSelect={() => onCopy(d.dia)}
                className="w-full flex items-center justify-between gap-3 px-2.5 min-h-11 sm:min-h-8 rounded-[4px] text-[12.5px] text-[var(--color-ink-2)] outline-none data-[highlighted]:bg-[var(--color-surface-sunken)] data-[highlighted]:text-[var(--color-ink)] cursor-pointer"
              >
                <span>{info.label}</span>
                <span className="text-[10.5px] font-mono-tabular text-[var(--color-muted-2)] truncate max-w-[110px]">
                  {summarize(d)}
                </span>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
