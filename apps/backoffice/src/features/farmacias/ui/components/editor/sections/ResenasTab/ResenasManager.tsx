'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { resenaEnWeb, type Resena, type ResenasReglas } from '@/core/farmacias/domain';
import { setResenaVisibleAction } from '@/features/farmacias/actions/resenaActions';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { Switch } from '@/shared/components/atoms/Switch';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { cn } from '@/shared/lib/cn';

type EstadoFiltro = 'todas' | 'en-web' | 'fuera';
type ComentarioFiltro = 'todas' | 'con' | 'sin';

const PAGE = 30;
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Por qué una reseña no sale en la web (null = sí sale). */
function motivoFuera(r: Resena, reglas: ResenasReglas): string | null {
  if (r.eliminadaEnGoogle) return 'Eliminada en Google';
  if (r.oculta) return 'Ocultada a mano';
  if (reglas.minRating != null && r.puntuacion < reglas.minRating) return `Menos de ${reglas.minRating}★`;
  if (reglas.soloConComentario && !(r.texto ?? '').trim()) return 'Sin comentario';
  return null;
}

/**
 * Gestión de reseñas en el editor:
 *   1. Reglas de la web (cada una con su switch): mínimo de estrellas y solo
 *      con comentario. Se guardan con el autoguardado y se aplican al publicar.
 *   2. Filtros para revisar la lista (no afectan a la web).
 *   3. Switch por reseña: mostrarla u ocultarla. Se guarda al momento.
 */
export function ResenasManager() {
  const { farmacia, patch, readOnly } = useFarmaciaEditor();
  const reglas = farmacia.resenasReglas;
  const [estado, setEstado] = useState<EstadoFiltro>('todas');
  const [estrellas, setEstrellas] = useState<number | 'todas'>('todas');
  const [comentario, setComentario] = useState<ComentarioFiltro>('todas');
  const [q, setQ] = useState('');
  const [visibles, setVisibles] = useState(PAGE);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTx] = useTransition();

  const setReglas = (next: Partial<ResenasReglas>) => patch({ resenasReglas: { ...reglas, ...next } });

  const resenas = farmacia.resenas;
  const enWebCount = resenas.filter((r) => resenaEnWeb(r, reglas)).length;
  const noOcultas = resenas.filter((r) => !r.oculta && !r.eliminadaEnGoogle);
  const media = noOcultas.length ? noOcultas.reduce((s, r) => s + r.puntuacion, 0) / noOcultas.length : null;

  const filtradas = useMemo(() => {
    const nq = normalize(q.trim());
    return [...resenas]
      .sort((a, b) => (a.fecha > b.fecha ? -1 : 1))
      .filter((r) => {
        const enWeb = resenaEnWeb(r, reglas);
        if (estado === 'en-web' && !enWeb) return false;
        if (estado === 'fuera' && enWeb) return false;
        if (estrellas !== 'todas' && r.puntuacion !== estrellas) return false;
        const tiene = Boolean((r.texto ?? '').trim());
        if (comentario === 'con' && !tiene) return false;
        if (comentario === 'sin' && tiene) return false;
        if (nq && !normalize(`${r.autor} ${r.texto ?? ''}`).includes(nq)) return false;
        return true;
      });
  }, [resenas, reglas, estado, estrellas, comentario, q]);

  const toggle = (r: Resena, visible: boolean) => {
    setPendingId(r.id);
    startTx(async () => {
      const res = await setResenaVisibleAction(farmacia.id, r.id, visible).catch(() => ({
        ok: false as const,
        error: 'No se pudo guardar. Revisa la conexión.',
      }));
      setPendingId(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      patch({ resenas: farmacia.resenas.map((x) => (x.id === r.id ? { ...x, oculta: !visible } : x)) });
      toast.success(visible ? 'Reseña visible en la web' : 'Reseña oculta en la web', {
        description: 'Se aplicará en la web al publicar.',
      });
    });
  };

  const selectCls =
    'h-8 rounded-[6px] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-2 text-[12.5px] text-[var(--color-ink-2)] focus:outline-none focus:border-[var(--color-accent)]';

  return (
    <>
      {/* ============= REGLAS DE LA WEB ============= */}
      <section aria-labelledby="sec-resenas-reglas">
        <SectionHeader
          id="sec-resenas-reglas"
          title="Qué reseñas salen en la web"
          hint="Cada regla se puede apagar. La media y el total de la web cuentan siempre todas las reseñas no ocultas, para no inflar la valoración."
        />
        <div className="card divide-y divide-[var(--color-hairline)]">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <label htmlFor="regla-min" className="text-[13.5px] font-medium text-[var(--color-ink)] cursor-pointer">
                Mínimo de estrellas
              </label>
              <p className="m-0 mt-0.5 text-[12px] text-[var(--color-muted-2)]">
                {reglas.minRating != null ? `Solo salen las de ${reglas.minRating}★ o más.` : 'Salen todas, tengan las estrellas que tengan.'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <select
                aria-label="Mínimo de estrellas"
                value={reglas.minRating ?? 4}
                disabled={reglas.minRating == null || readOnly}
                onChange={(e) => setReglas({ minRating: Number(e.target.value) })}
                className={selectCls}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}★ o más
                  </option>
                ))}
              </select>
              <Switch
                id="regla-min"
                checked={reglas.minRating != null}
                onCheckedChange={(v) => setReglas({ minRating: v ? 4 : null })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <label htmlFor="regla-comentario" className="text-[13.5px] font-medium text-[var(--color-ink)] cursor-pointer">
                Solo con comentario
              </label>
              <p className="m-0 mt-0.5 text-[12px] text-[var(--color-muted-2)]">
                {reglas.soloConComentario ? 'Las valoraciones sin texto no se muestran.' : 'También salen las valoraciones sin texto.'}
              </p>
            </div>
            <Switch
              id="regla-comentario"
              checked={reglas.soloConComentario}
              onCheckedChange={(v) => setReglas({ soloConComentario: v })}
            />
          </div>
        </div>
      </section>

      {/* ============= LISTA ============= */}
      <section aria-labelledby="sec-resenas-lista">
        <SectionHeader
          id="sec-resenas-lista"
          title="Reseñas de Google"
          hint="Usa el switch de cada reseña para mostrarla u ocultarla en la web. Los filtros solo sirven para revisar la lista."
          actions={
            resenas.length > 0 && (
              <div className="flex items-center gap-4 text-[12px] text-[var(--color-muted)]">
                <span>
                  En la web <strong className="font-mono-tabular text-[var(--color-ink)] text-[13px]">{enWebCount}</strong>/{resenas.length}
                </span>
                {media != null && (
                  <span>
                    Media <strong className="font-mono-tabular text-[var(--color-ink)] text-[13px]">{media.toFixed(1)}</strong>/5
                  </span>
                )}
              </div>
            )
          }
        />

        {resenas.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center mb-3">
              <NavIcon name="ChatCircleText" size={18} className="text-[var(--color-muted)]" />
            </div>
            <p className="text-[13.5px] text-[var(--color-ink-2)] m-0">Aún no hay reseñas importadas.</p>
          </div>
        ) : (
          <>
            <div role="search" className="mb-3 flex flex-wrap items-center gap-2">
              <select aria-label="Filtrar por estado" value={estado} onChange={(e) => { setEstado(e.target.value as EstadoFiltro); setVisibles(PAGE); }} className={selectCls}>
                <option value="todas">Todas</option>
                <option value="en-web">Salen en la web</option>
                <option value="fuera">No salen</option>
              </select>
              <select
                aria-label="Filtrar por estrellas"
                value={estrellas}
                onChange={(e) => { setEstrellas(e.target.value === 'todas' ? 'todas' : Number(e.target.value)); setVisibles(PAGE); }}
                className={selectCls}
              >
                <option value="todas">★ Todas</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}★
                  </option>
                ))}
              </select>
              <select aria-label="Filtrar por comentario" value={comentario} onChange={(e) => { setComentario(e.target.value as ComentarioFiltro); setVisibles(PAGE); }} className={selectCls}>
                <option value="todas">Con y sin comentario</option>
                <option value="con">Con comentario</option>
                <option value="sin">Sin comentario</option>
              </select>
              <input
                type="search"
                aria-label="Buscar en reseñas"
                placeholder="Buscar autor o texto…"
                value={q}
                onChange={(e) => { setQ(e.target.value); setVisibles(PAGE); }}
                className={cn(selectCls, 'min-w-[180px] flex-1')}
              />
              <span className="text-[12px] text-[var(--color-muted)] font-mono-tabular">{filtradas.length} resultados</span>
            </div>

            {filtradas.length === 0 ? (
              <p className="card p-6 m-0 text-center text-[13px] text-[var(--color-muted)]">Ninguna reseña coincide con los filtros.</p>
            ) : (
              <ul className="space-y-2 list-none p-0 m-0">
                {filtradas.slice(0, visibles).map((r) => {
                  const motivo = motivoFuera(r, reglas);
                  const manualVisible = !r.oculta && !r.eliminadaEnGoogle;
                  return (
                    <li key={r.id} className={cn('card p-4 flex items-start gap-3', motivo && 'opacity-70')}>
                      <div className="shrink-0 h-9 w-9 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center text-[12px] font-medium text-[var(--color-ink-2)]">
                        {r.autor.slice(0, 2).toUpperCase() || '—'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13.5px] font-medium text-[var(--color-ink)]">{r.autor || 'Anónimo'}</span>
                          <span aria-label={`${r.puntuacion} de 5 estrellas`} className="text-[12px] text-[#f7b500]">
                            {'★'.repeat(r.puntuacion)}
                            <span className="text-[var(--color-hairline-strong)]">{'★'.repeat(5 - r.puntuacion)}</span>
                          </span>
                          <span className="text-[11px] font-mono-tabular text-[var(--color-muted-2)]">{r.fecha.slice(0, 10)}</span>
                          <span
                            className={cn(
                              'inline-flex h-5 items-center rounded-full px-2 text-[10.5px] font-mono-tabular uppercase tracking-wider',
                              motivo ? 'bg-[var(--color-surface-sunken)] text-[var(--color-muted)]' : 'bg-[var(--color-green-soft)] text-[var(--color-green-ink)]',
                            )}
                          >
                            {motivo ?? 'En la web'}
                          </span>
                        </div>
                        {r.texto ? (
                          <p className="text-[13px] text-[var(--color-ink-2)] leading-[1.55] mt-1 mb-0">{r.texto}</p>
                        ) : (
                          <p className="text-[12.5px] italic text-[var(--color-muted)] mt-1 mb-0">Sin comentario</p>
                        )}
                      </div>
                      <Switch
                        checked={manualVisible}
                        disabled={r.eliminadaEnGoogle || pendingId === r.id}
                        onCheckedChange={(v) => toggle(r, v)}
                        aria-label={`Mostrar en la web la reseña de ${r.autor || 'Anónimo'}`}
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            {filtradas.length > visibles && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={() => setVisibles((n) => n + PAGE)}
                  className="h-8 rounded-[6px] px-3 text-[12.5px] text-[var(--color-ink-2)] border border-[var(--color-hairline)] hover:bg-[var(--color-surface-2)]"
                >
                  Ver {Math.min(PAGE, filtradas.length - visibles)} más
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
