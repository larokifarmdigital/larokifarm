'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { resenaEnWeb, type Resena, type ResenasReglas } from '@/core/farmacias/domain';
import { setResenaVisibleAction } from '@/features/farmacias/actions/resenaActions';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { Switch } from '@/shared/components/atoms/Switch';
import { Select, StarsLeading } from '@/shared/components/atoms/Select';
import { IconInput } from '@/shared/components/atoms/IconInput';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { cn } from '@/shared/lib/cn';

type EstadoFiltro = 'todas' | 'en-web' | 'fuera';
type ComentarioFiltro = 'todas' | 'con' | 'sin';

const PAGE = 30;
const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Foto del autor (servida desde R2 por el backoffice) o sus iniciales si no hay o falla. */
function Avatar({ autor, url }: { autor: string; url?: string }) {
  const [error, setError] = useState(false);
  const iniciales = autor.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '—';
  if (url && !error) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`${url}?editor&w=72`}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setError(true)}
        className="shrink-0 h-9 w-9 rounded-full object-cover bg-[var(--color-surface-sunken)]"
      />
    );
  }
  return (
    <div aria-hidden className="shrink-0 h-9 w-9 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center text-[12px] font-medium text-[var(--color-ink-2)]">
      {iniciales}
    </div>
  );
}

/** Por qué una reseña no sale en la web (null = sí sale). */
function motivoFuera(r: Resena, reglas: ResenasReglas): string | null {
  if (r.eliminadaEnGoogle) return 'Eliminada en Google';
  if (r.oculta) return 'Ocultada a mano';
  if (reglas.minRating != null && r.puntuacion < reglas.minRating) return `Menos de ${reglas.minRating} estrellas`;
  if (reglas.soloConComentario && !(r.texto ?? '').trim()) return 'Sin comentario';
  return null;
}

/** Reglas de la web (autoguardado, se aplican al publicar), filtros solo para revisar la lista y un switch por reseña (se guarda al momento). */
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
  const conTexto = resenas.filter((r) => (r.texto ?? '').trim()).length;
  const porEstrellas = resenas.reduce<Record<number, number>>((acc, r) => ({ ...acc, [r.puntuacion]: (acc[r.puntuacion] ?? 0) + 1 }), {});
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


  return (
    <>
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
                {reglas.minRating != null
                  ? reglas.minRating === 5
                    ? 'Solo salen las de 5 estrellas.'
                    : reglas.minRating === 1
                      ? 'Salen las de 1 estrella o más.'
                      : `Solo salen las de ${reglas.minRating} estrellas o más.`
                  : 'Salen todas, tengan las estrellas que tengan.'}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Select
                aria-label="Mínimo de estrellas"
                value={String(reglas.minRating ?? 4)}
                disabled={reglas.minRating == null || readOnly}
                onValueChange={(v) => setReglas({ minRating: Number(v) })}
                className="w-[168px] sm:w-[180px]"
                options={[5, 4, 3, 2, 1].map((n) => ({
                  value: String(n),
                  label: n === 5 ? 'Solo 5' : `${n} o más`,
                  leading: <StarsLeading n={n} />,
                }))}
              />
              <Switch
                id="regla-min"
                aria-label="Filtrar por estrellas mínimas"
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
              aria-label="Solo reseñas con comentario"
              checked={reglas.soloConComentario}
              onCheckedChange={(v) => setReglas({ soloConComentario: v })}
            />
          </div>
        </div>
      </section>

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
            <div role="search" className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1.15fr)_minmax(0,1.3fr)]">
              <Select
                aria-label="Filtrar por estado"
                value={estado}
                onValueChange={(v) => { setEstado(v as EstadoFiltro); setVisibles(PAGE); }}
                options={[
                  { value: 'todas', label: 'Todos los estados', hint: String(resenas.length) },
                  { value: 'en-web', label: 'Salen en la web', hint: String(enWebCount) },
                  { value: 'fuera', label: 'No salen', hint: String(resenas.length - enWebCount) },
                ]}
              />
              <Select
                aria-label="Filtrar por estrellas"
                value={String(estrellas)}
                onValueChange={(v) => { setEstrellas(v === 'todas' ? 'todas' : Number(v)); setVisibles(PAGE); }}
                options={[
                  { value: 'todas', label: 'Todas las estrellas', hint: String(resenas.length) },
                  ...[5, 4, 3, 2, 1].map((n) => ({
                    value: String(n),
                    label: n === 1 ? '1 estrella' : `${n} estrellas`,
                    leading: <StarsLeading n={n} />,
                    hint: String(porEstrellas[n] ?? 0),
                  })),
                ]}
              />
              <Select
                aria-label="Filtrar por comentario"
                value={comentario}
                onValueChange={(v) => { setComentario(v as ComentarioFiltro); setVisibles(PAGE); }}
                options={[
                  { value: 'todas', label: 'Con y sin comentario', hint: String(resenas.length) },
                  { value: 'con', label: 'Con comentario', hint: String(conTexto) },
                  { value: 'sin', label: 'Sin comentario', hint: String(resenas.length - conTexto) },
                ]}
              />
              <div className="sm:col-span-3 lg:col-span-1">
                <IconInput
                  type="search"
                  icon={<NavIcon name="MagnifyingGlass" size={14} />}
                  label="Buscar en reseñas"
                  aria-label="Buscar en reseñas"
                  placeholder="Buscar autor o texto…"
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setVisibles(PAGE); }}
                />
              </div>
            </div>
            <p className="m-0 mb-2 text-right text-[12px] text-[var(--color-muted)] font-mono-tabular" aria-live="polite">
              {filtradas.length} {filtradas.length === 1 ? 'resultado' : 'resultados'}
            </p>

            {filtradas.length === 0 ? (
              <p className="card p-6 m-0 text-center text-[13px] text-[var(--color-muted)]">Ninguna reseña coincide con los filtros.</p>
            ) : (
              <ul className="space-y-2 list-none p-0 m-0">
                {filtradas.slice(0, visibles).map((r) => {
                  const motivo = motivoFuera(r, reglas);
                  const manualVisible = !r.oculta && !r.eliminadaEnGoogle;
                  return (
                    <li key={r.id} className={cn('card p-4 flex items-start gap-3', motivo && 'bg-[var(--color-surface-2)]')}>
                      <Avatar autor={r.autor} url={r.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13.5px] font-medium text-[var(--color-ink)]">{r.autor || 'Anónimo'}</span>
                          <span role="img" aria-label={`${r.puntuacion} de 5 estrellas`} className="text-[13px] text-[#b07d00]">
                            {'★'.repeat(r.puntuacion)}
                            <span className="text-[var(--color-control-border)]">{'★'.repeat(5 - r.puntuacion)}</span>
                          </span>
                          <span className="text-[12.5px] text-[var(--color-muted)]">
                            {new Date(r.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span
                            className={cn(
                              'inline-flex min-h-5 items-center rounded-full px-2 text-[12px] font-medium',
                              motivo ? 'bg-[var(--color-surface-sunken)] text-[var(--color-ink-2)]' : 'bg-[var(--color-green-soft)] text-[var(--color-green-ink)]',
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
                  className="min-h-11 sm:min-h-9 rounded-[6px] px-4 text-[13.5px] text-[var(--color-ink-2)] border border-[var(--color-control-border)] hover:bg-[var(--color-surface-2)]"
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
