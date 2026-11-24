'use client';

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/shared/components/atoms/Button';
import { Chip } from '@/shared/components/atoms/Chip';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Select } from '@/shared/components/atoms/Select';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { fechaFila } from '@/shared/lib/fechasMadrid';
import { estimarSegundos, textoDuracion, type Ejecucion } from '@/core/precios/domain';
import { cancelarComparacionAction, compararListaAction, reanudarComparacionAction, type ResultadoLanzar } from '../../../actions/listasActions';
import { cuando } from '../../lib/precios';
import { ESTADO_EJECUCION_LABEL, ESTADO_EJECUCION_TONO, duracion, estadoVisible, numero, type EstadoVisible } from '../../lib/listas';

const REFRESCO_MS = 5000;

// Tras lanzar/cancelar/reanudar el botón desaparece: el foco va al título del
// estado cuando ya se ha pintado el nuevo (router.refresh es asíncrono).
let focoPendiente = false;
const pedirFocoEstado = () => {
  focoPendiente = true;
};

/** Botón principal de la cabecera de la lista según el estado (Comparar / Descargar / Volver a comparar). */
export function AccionPrincipalLista({ listaId, ejecucion, esLaUltima }: { listaId: string; ejecucion: Ejecucion | null; esLaUltima: boolean }) {
  const v = ejecucion ? estadoVisible(ejecucion) : null;
  const lanzar = useLanzar(listaId);
  if (!esLaUltima && ejecucion) return <BotonExcel runId={ejecucion.id} accent />;
  if (!v) return lanzar.boton('Comparar lista', 'accent');
  if (v === 'terminada') return <BotonExcel runId={ejecucion!.id} accent />;
  if (v === 'cancelada') return lanzar.boton('Volver a comparar', 'accent');
  return null;
}

function BotonExcel({ runId, accent }: { runId: string; accent?: boolean }) {
  return (
    <Button asChild variant={accent ? 'accent' : 'secondary'} className="w-full sm:w-auto">
      <a href={`/api/precios/comparaciones/${runId}/excel`} download>
        <NavIcon name="DownloadSimple" size={16} />
        Descargar Excel
      </a>
    </Button>
  );
}

function mostrar(r: ResultadoLanzar, ok: string) {
  if (!r.ok) toast.error(r.error);
  else if (r.aviso) toast.message(r.aviso);
  else toast.success(ok);
}

function useLanzar(listaId: string) {
  const router = useRouter();
  const [pendiente, start] = useTransition();
  return {
    pendiente,
    boton: (texto: string, variante: 'accent' | 'secondary') => (
      <Button
        type="button"
        variant={variante}
        className="w-full sm:w-auto"
        aria-disabled={pendiente || undefined}
        onClick={() => {
          if (pendiente) return;
          start(async () => {
            mostrar(await compararListaAction(listaId), 'Comparación en marcha');
            router.refresh();
            pedirFocoEstado();
          });
        }}
      >
        <NavIcon name="ArrowsClockwise" size={16} />
        {pendiente ? 'Poniendo en marcha…' : texto}
      </Button>
    ),
  };
}

/** Tarjeta "Comparación": estado, progreso (se refresca solo), cancelar/reanudar y selector de comparaciones. */
export function TarjetaComparacion({
  listaId,
  ejecucion,
  ejecuciones,
  esLaUltima,
  productos,
  recientes,
}: {
  listaId: string;
  ejecucion: Ejecucion | null;
  ejecuciones: Ejecucion[];
  esLaUltima: boolean;
  productos: number;
  /** Productos con consulta en las últimas 24 h (no se vuelven a buscar). */
  recientes: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const v: EstadoVisible | null = ejecucion ? estadoVisible(ejecucion) : null;
  const enMarcha = v === 'en_cola' || v === 'comparando';
  const [confirmar, setConfirmar] = useState(false);
  const [pendiente, start] = useTransition();
  const lanzar = useLanzar(listaId);
  const [anuncio, setAnuncio] = useState('');
  // Anuncios: cambios de estado y cada 25 % (nunca en cada refresco). Estado derivado en render.
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

  // Título de la pestaña con el % mientras compara.
  useEffect(() => {
    if (v !== 'comparando' || !ejecucion?.total) return;
    const base = document.title.replace(/^\(\d+ %\) /, '');
    document.title = `(${Math.floor((ejecucion.hechos / ejecucion.total) * 100)} %) ${base}`;
    return () => {
      document.title = document.title.replace(/^\(\d+ %\) /, '');
    };
  }, [v, ejecucion]);

  function cancelar() {
    if (!ejecucion) return;
    start(async () => {
      const r = await cancelarComparacionAction(ejecucion.id);
      mostrar(r, 'Comparación cancelada');
      setConfirmar(false);
      router.refresh();
      pedirFocoEstado();
    });
  }

  function reanudar() {
    if (!ejecucion) return;
    start(async () => {
      mostrar(await reanudarComparacionAction(ejecucion.id), 'Comparación reanudada');
      router.refresh();
      pedirFocoEstado();
    });
  }

  const pct = ejecucion?.total ? Math.round((ejecucion.hechos / ejecucion.total) * 100) : 0;
  const restante = ejecucion ? estimarSegundos(ejecucion.total - ejecucion.hechos) : 0;
  const filtro = (r: string) => `${pathname}?${new URLSearchParams({ ...(esLaUltima ? {} : { run: ejecucion!.id }), resultado: r })}`;
  const titulo = (t: string) => (
    <h3 id="comparacion-estado" tabIndex={-1} className="m-0 text-[16px] font-semibold text-[var(--color-ink)] focus:outline-none">
      {t}
    </h3>
  );

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
            {titulo('Aún no has comparado esta lista.')}
            <p className="m-0">
              Tardará {textoDuracion(estimarSegundos(productos - recientes))}.
              {recientes > 0 && ` Ya tenemos precios de las últimas 24 horas de ${numero(recientes)} productos: esos no se vuelven a buscar.`}
            </p>
          </>
        )}

        {v === 'en_cola' && (
          <>
            {titulo('Esperando turno')}
            <p className="m-0">Empezará en unos minutos. Si hay otra lista comparándose, empezará cuando termine.</p>
          </>
        )}

        {v === 'comparando' && ejecucion && (
          <>
            {titulo('Comparando precios…')}
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={ejecucion.total}
              aria-valuenow={ejecucion.hechos}
              aria-valuetext={`${numero(ejecucion.hechos)} de ${numero(ejecucion.total)} productos`}
              aria-labelledby="comparacion-estado"
              className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-sunken)]"
            >
              <div className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
            <p className="m-0" aria-hidden>
              <strong className="tabular-nums text-[var(--color-ink)]">
                {numero(ejecucion.hechos)} de {numero(ejecucion.total)} productos
              </strong>{' '}
              · quedan {textoDuracion(restante)}
            </p>
            <p className="m-0">Puedes cerrar esta página: la comparación sigue y los resultados se guardan aquí.</p>
            {ejecucion.empezadaEn && (
              <p className="m-0 text-[13px] text-[var(--color-muted)]">
                Empezó {cuando(ejecucion.empezadaEn)}
                {ejecucion.autor ? ` (${ejecucion.autor})` : ''}
              </p>
            )}
          </>
        )}

        {v === 'terminada' && ejecucion && (
          <>
            {titulo(`Terminada ${ejecucion.terminadaEn ? cuando(ejecucion.terminadaEn) : ''}${ejecucion.empezadaEn && ejecucion.terminadaEn ? ` · tardó ${duracion(ejecucion.empezadaEn, ejecucion.terminadaEn)}` : ''}`)}
            <p className="m-0 flex flex-wrap gap-x-4 gap-y-1">
              <a href={filtro('con_precio')} className="font-medium text-[var(--color-accent)] underline underline-offset-[3px] min-h-11 sm:min-h-6 inline-flex items-center">
                {numero(ejecucion.conPrecio)} con precio verificado
              </a>
              <a href={filtro('sin_precio')} className="font-medium text-[var(--color-accent)] underline underline-offset-[3px] min-h-11 sm:min-h-6 inline-flex items-center">
                Ver los que no tienen precio
              </a>
            </p>
          </>
        )}

        {v === 'interrumpida' && ejecucion && (
          <>
            {titulo(`La comparación se paró con ${numero(ejecucion.hechos)} de ${numero(ejecucion.total)} productos.`)}
            <p className="m-0">No se ha perdido nada: al reanudar, sigue por donde iba.</p>
          </>
        )}

        {v === 'cancelada' && ejecucion && (
          <>
            {titulo(`Cancelaste la comparación con ${numero(ejecucion.hechos)} de ${numero(ejecucion.total)} productos.`)}
            <p className="m-0">Lo comparado hasta entonces sigue aquí.</p>
          </>
        )}

        {esLaUltima && (
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            {enMarcha && (
              <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setConfirmar(true)}>
                Cancelar comparación
              </Button>
            )}
            {v === 'interrumpida' && (
              <Button type="button" variant="accent" className="w-full sm:w-auto" aria-disabled={pendiente || undefined} onClick={() => !pendiente && reanudar()}>
                <NavIcon name="ArrowsClockwise" size={16} />
                Reanudar
              </Button>
            )}
            {v === 'terminada' && lanzar.boton('Volver a comparar', 'secondary')}
            {(v === 'interrumpida' || v === 'cancelada') && ejecucion && ejecucion.hechos > 0 && <BotonExcel runId={ejecucion.id} />}
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
          onConfirm={cancelar}
        />
      )}
    </section>
  );
}
