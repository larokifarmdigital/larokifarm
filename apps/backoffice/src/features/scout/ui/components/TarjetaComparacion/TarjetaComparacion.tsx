'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/shared/components/atoms/Button';
import { Chip } from '@/shared/components/atoms/Chip';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Select } from '@/shared/components/atoms/Select';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { cn } from '@/shared/lib/cn';
import { fechaFila } from '@/shared/lib/fechasMadrid';
import { estimarSegundos, textoDuracion, type Ejecucion } from '@/core/precios/domain';
import { cancelarComparacionAction, compararListaAction, reanudarComparacionAction, type ResultadoLanzar } from '../../../actions/listasActions';
import { cuando } from '../../lib/precios';
import { ESTADO_EJECUCION_LABEL, ESTADO_EJECUCION_TONO, duracion, estadoVisible, numero, type EstadoVisible } from '../../lib/listas';

const REFRESCO_MS = 3000;

// Tras lanzar/cancelar/reanudar el botón desaparece: el foco va al título del
// estado cuando ya se ha pintado el nuevo (router.refresh es asíncrono).
let focoPendiente = false;

function BotonExcel({ runId, principal }: { runId: string; principal?: boolean }) {
  return (
    <Button asChild variant={principal ? 'accent' : 'secondary'} className="w-full sm:w-auto">
      <a href={`/api/precios/comparaciones/${runId}/excel`} download>
        <NavIcon name="DownloadSimple" size={16} />
        Descargar Excel
      </a>
    </Button>
  );
}

/** Barra de progreso. Sin productos hechos todavía, una barra que se mueve (no un 0 % quieto). */
function Barra({ hechos, total, etiqueta }: { hechos: number; total: number; etiqueta: string }) {
  const indeterminada = hechos === 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={indeterminada ? undefined : hechos}
      aria-valuetext={indeterminada ? 'Empezando' : `${numero(hechos)} de ${numero(total)} productos`}
      aria-label={etiqueta}
      className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-sunken)]"
    >
      {indeterminada ? (
        <div className="barra-indeterminada absolute inset-y-0 w-1/3 rounded-full bg-[var(--color-accent)]" />
      ) : (
        <div className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500" style={{ width: `${Math.max(3, Math.round((hechos / total) * 100))}%` }} />
      )}
    </div>
  );
}

/**
 * Tarjeta "Comparación": estado y TODAS sus acciones (comparar, cancelar,
 * reanudar, descargar). Mientras está en marcha se refresca sola.
 */
export function TarjetaComparacion({
  listaId,
  ejecucion,
  ejecuciones,
  esLaUltima,
  productos,
  recientes,
  sinPrecio,
  receta,
}: {
  listaId: string;
  ejecucion: Ejecucion | null;
  ejecuciones: Ejecucion[];
  esLaUltima: boolean;
  productos: number;
  /** Productos con consulta en las últimas 24 h (no se vuelven a buscar). */
  recientes: number;
  /** Productos que se buscaron online y ninguna farmacia tiene con el mismo código. */
  sinPrecio: number;
  /** Con receta: no se buscan online (tienen su precio oficial). */
  receta: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const v: EstadoVisible | null = ejecucion ? estadoVisible(ejecucion) : null;
  const enMarcha = v === 'en_cola' || v === 'comparando';
  const [confirmar, setConfirmar] = useState(false);
  const [pendiente, start] = useTransition();

  // Anuncios: cambios de estado y cada 25 % (nunca en cada refresco). Estado derivado en render.
  const [anuncio, setAnuncio] = useState('');
  const cuarto = ejecucion?.total ? Math.floor((ejecucion.hechos / ejecucion.total) * 4) : 0;
  const [visto, setVisto] = useState<{ estado: EstadoVisible | null; cuarto: number }>({ estado: v, cuarto });
  if (ejecucion && (visto.estado !== v || visto.cuarto !== cuarto)) {
    if (visto.estado !== v) {
      if (v === 'comparando') setAnuncio('La comparación ha empezado.');
      if (v === 'terminada') setAnuncio(`Comparación terminada: ${numero(ejecucion.conPrecio)} productos con precio verificado.`);
      if (v === 'interrumpida') setAnuncio('La comparación se ha parado.');
    } else if (v === 'comparando' && cuarto > visto.cuarto && cuarto < 4) {
      setAnuncio(`Comparados ${numero(ejecucion.hechos)} de ${numero(ejecucion.total)} productos.`);
    }
    setVisto({ estado: v, cuarto });
  }

  // Aviso visible al terminar, solo si se ha visto en marcha en esta pantalla (id fijo: nunca repetido).
  const anterior = useRef(v);
  useEffect(() => {
    const antes = anterior.current;
    anterior.current = v;
    if (v === 'terminada' && (antes === 'comparando' || antes === 'en_cola') && ejecucion) {
      toast.success('Comparación terminada', { id: `fin-${ejecucion.id}`, description: 'Ya puedes descargar el Excel.' });
    }
  }, [v, ejecucion]);

  useEffect(() => {
    if (!focoPendiente) return;
    focoPendiente = false;
    document.getElementById('comparacion-estado')?.focus();
  }, [v, ejecucion?.id]);

  // Refresco mientras está en marcha y la pestaña se ve.
  useEffect(() => {
    if (!enMarcha || !esLaUltima) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, REFRESCO_MS);
    return () => window.clearInterval(t);
  }, [enMarcha, esLaUltima, router]);

  // Título de la pestaña: % mientras compara y "Terminada" al acabar (si se veía en marcha).
  const [sehaVistoEnMarcha, setSeHaVistoEnMarcha] = useState(enMarcha);
  if (enMarcha && !sehaVistoEnMarcha) setSeHaVistoEnMarcha(true);
  useEffect(() => {
    const base = document.title.replace(/^(\(\d+ %\)|Terminada ·) /, '');
    if (v === 'comparando' && ejecucion?.total) document.title = `(${Math.floor((ejecucion.hechos / ejecucion.total) * 100)} %) ${base}`;
    else if (v === 'terminada' && sehaVistoEnMarcha) document.title = `Terminada · ${base}`;
    else return;
    return () => {
      document.title = document.title.replace(/^(\(\d+ %\)|Terminada ·) /, '');
    };
  }, [v, ejecucion, sehaVistoEnMarcha]);

  function accion(fn: () => Promise<ResultadoLanzar>, ok: string) {
    if (pendiente) return;
    start(async () => {
      const r = await fn();
      if (r.ok) toast.success(ok);
      else toast.error(r.error);
      setConfirmar(false);
      focoPendiente = true;
      router.refresh();
    });
  }

  const comparar = (texto: string, principal = true) => (
    <Button
      type="button"
      variant={principal ? 'accent' : 'secondary'}
      className="w-full sm:w-auto"
      aria-disabled={pendiente || undefined}
      onClick={() => accion(() => compararListaAction(listaId), 'Comparación en marcha')}
    >
      <NavIcon name="ArrowsClockwise" size={16} />
      {pendiente ? 'Poniendo en marcha…' : texto}
    </Button>
  );

  const restante = ejecucion ? estimarSegundos(ejecucion.total - ejecucion.hechos) : 0;
  const filtro = (r: string) => `${pathname}?${new URLSearchParams({ ...(esLaUltima || !ejecucion ? {} : { run: ejecucion.id }), resultado: r })}`;
  const titulo = (t: string) => (
    <h3 id="comparacion-estado" tabIndex={-1} className="m-0 text-[16px] font-semibold text-[var(--color-ink)] focus:outline-none">
      {t}
    </h3>
  );
  const acciones = (contenido: React.ReactNode) => <div className="flex flex-col sm:flex-row gap-2.5 pt-1">{contenido}</div>;

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="comparacion-titulo">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="comparacion-titulo" className="m-0 text-[17px] font-semibold text-[var(--color-ink)]">
          Comparación
        </h2>
        {v && <Chip tone={ESTADO_EJECUCION_TONO[v]}>{ESTADO_EJECUCION_LABEL[v]}</Chip>}
      </div>

      {ejecuciones.length > 1 && ejecucion && (
        <div className="mt-3 max-w-sm">
          <label htmlFor="selector-comparacion" className="mb-1.5 block text-[14px] font-medium text-[var(--color-ink-2)]">
            Comparación del
          </label>
          <Select
            id="selector-comparacion"
            value={ejecucion.id}
            onValueChange={(id) => router.push(id === ejecuciones[0].id ? pathname : `${pathname}?run=${id}`, { scroll: false })}
            options={ejecuciones.map((e, i) => ({
              value: e.id,
              label: `${fechaFila(new Date(e.creadaEn)).corta}${i === 0 ? ' (la última)' : ''}`,
              description: `${ESTADO_EJECUCION_LABEL[estadoVisible(e)]} · ${numero(e.conPrecio)} con precio`,
            }))}
          />
          {!esLaUltima && (
            <p className="m-0 mt-1.5 text-[13.5px] text-[var(--color-ink-2)]">
              Estás viendo una comparación antigua.{' '}
              <a href={pathname} className="font-medium text-[var(--color-accent)] underline underline-offset-[3px]">
                Ver la última
              </a>
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 text-[14px] text-[var(--color-ink-2)]">
        {!ejecucion && (
          <>
            {titulo('Aún no has comparado esta lista')}
            <p className="m-0">
              {recientes >= productos
                ? `Ya tenemos precios de hoy para los ${numero(productos)} productos: la comparación será casi inmediata.`
                : `Buscaremos ${numero(productos - recientes)} productos en 10 farmacias online${recientes > 0 ? ` (los otros ${numero(recientes)} ya tienen precio de las últimas 24 horas)` : ''}. Tardará ${textoDuracion(estimarSegundos(productos - recientes))}.`}
            </p>
            {acciones(comparar('Comparar lista'))}
          </>
        )}

        {v === 'en_cola' && ejecucion && (
          <>
            {titulo('Preparando la comparación…')}
            <Barra hechos={0} total={ejecucion.total} etiqueta="Preparando la comparación" />
            <p className="m-0">Empezará enseguida. Puedes cerrar esta página: la comparación sigue y los resultados se guardan aquí.</p>
          </>
        )}

        {v === 'comparando' && ejecucion && (
          <>
            {titulo('Comparando precios…')}
            <Barra hechos={ejecucion.hechos} total={ejecucion.total} etiqueta="Progreso de la comparación" />
            <p className="m-0" aria-hidden>
              <strong className="tabular-nums text-[var(--color-ink)]">
                {numero(ejecucion.hechos)} de {numero(ejecucion.total)} productos
              </strong>{' '}
              · {ejecucion.hechos === 0 ? 'empezando: el primer producto tarda un poco más' : `quedan ${textoDuracion(restante)}`}
            </p>
            <p className="m-0">Puedes cerrar esta página: la comparación sigue y los resultados se guardan aquí.</p>
          </>
        )}

        {v === 'terminada' && ejecucion && (
          <>
            {titulo('Ya tienes los precios de tu lista')}
            <p className="m-0 text-[13.5px] text-[var(--color-muted)]">
              Terminada {ejecucion.terminadaEn ? cuando(ejecucion.terminadaEn) : ''}
              {ejecucion.empezadaEn && ejecucion.terminadaEn ? ` · tardó ${duracion(ejecucion.empezadaEn, ejecucion.terminadaEn)}` : ''}
            </p>
            <p className="m-0 flex flex-wrap gap-x-4 gap-y-1">
              <a href={filtro('con_precio')} className="font-medium text-[var(--color-accent)] underline underline-offset-[3px] min-h-11 sm:min-h-6 inline-flex items-center">
                {numero(ejecucion.conPrecio)} con precio verificado
              </a>
              {sinPrecio > 0 && (
                <a href={filtro('sin_precio')} className="font-medium text-[var(--color-accent)] underline underline-offset-[3px] min-h-11 sm:min-h-6 inline-flex items-center">
                  {numero(sinPrecio)} sin precio en ninguna web
                </a>
              )}
              {receta > 0 && (
                <a href={filtro('receta')} className="font-medium text-[var(--color-accent)] underline underline-offset-[3px] min-h-11 sm:min-h-6 inline-flex items-center">
                  {numero(receta)} con receta (precio oficial)
                </a>
              )}
            </p>
            {acciones(
              <>
                <BotonExcel runId={ejecucion.id} principal />
                {esLaUltima && comparar('Volver a comparar', false)}
              </>,
            )}
          </>
        )}

        {v === 'interrumpida' && ejecucion && (
          <>
            {titulo(ejecucion.hechos > 0 ? `La comparación se paró con ${numero(ejecucion.hechos)} de ${numero(ejecucion.total)} productos` : 'La comparación no ha podido empezar')}
            <p className={cn('m-0', ejecucion.error && 'rounded-[8px] bg-[var(--color-yellow-soft)] px-3 py-2 text-[var(--color-yellow-ink)]')} role={ejecucion.error ? 'alert' : undefined}>
              {ejecucion.error ?? 'No se ha perdido nada: al reanudar, sigue por donde iba.'}
            </p>
            {esLaUltima &&
              acciones(
                <>
                  <Button type="button" variant="accent" className="w-full sm:w-auto" aria-disabled={pendiente || undefined} onClick={() => accion(() => reanudarComparacionAction(ejecucion.id), 'Comparación reanudada')}>
                    <NavIcon name="ArrowsClockwise" size={16} />
                    {ejecucion.hechos > 0 ? 'Reanudar' : 'Intentar de nuevo'}
                  </Button>
                  {ejecucion.hechos > 0 && <BotonExcel runId={ejecucion.id} />}
                </>,
              )}
          </>
        )}

        {v === 'cancelada' && ejecucion && (
          <>
            {titulo(ejecucion.hechos > 0 ? `Cancelaste la comparación con ${numero(ejecucion.hechos)} de ${numero(ejecucion.total)} productos` : 'Cancelaste la comparación')}
            {ejecucion.hechos > 0 && <p className="m-0">Lo comparado hasta entonces sigue aquí.</p>}
            {esLaUltima &&
              acciones(
                <>
                  {comparar('Volver a comparar')}
                  {ejecucion.hechos > 0 && <BotonExcel runId={ejecucion.id} />}
                </>,
              )}
          </>
        )}

        {!esLaUltima && ejecucion && v !== 'terminada' && ejecucion.hechos > 0 && acciones(<BotonExcel runId={ejecucion.id} principal />)}

        {enMarcha && esLaUltima && (
          <div className="pt-1">
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setConfirmar(true)}>
              Cancelar comparación
            </Button>
          </div>
        )}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      {ejecucion && (
        <ConfirmDialog
          open={confirmar}
          onOpenChange={setConfirmar}
          title="¿Cancelar la comparación?"
          description={
            ejecucion.hechos > 0
              ? `Los ${numero(ejecucion.hechos)} productos ya comparados se quedan guardados. Los otros ${numero(ejecucion.total - ejecucion.hechos)} no se compararán.`
              : 'Todavía no se ha comparado ningún producto. Podrás volver a comparar la lista cuando quieras.'
          }
          confirmLabel="Cancelar comparación"
          cancelLabel="Seguir comparando"
          variant="danger"
          onConfirm={() => accion(() => cancelarComparacionAction(ejecucion.id), 'Comparación cancelada')}
        />
      )}
    </section>
  );
}
