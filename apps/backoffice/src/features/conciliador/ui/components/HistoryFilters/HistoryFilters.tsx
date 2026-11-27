'use client';

import { Select } from '@/shared/components/atoms/Select';
import { FiltrosMovil } from '@/shared/components/molecules/FiltrosMovil';
import { DateRangePicker, enfocarDia, resumenCorto } from '@/shared/components/molecules/DateRangePicker';
import { useEffect, useId, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import { PERIODOS } from '../../lib/historial';

export const BUSCADOR_ID = 'buscador-historial';

/** Valor del Select "Periodo" → claves de la URL (las mismas de siempre: periodo, from, to). */
const OPCIONES_PERIODO = [
  { value: '', label: 'Cualquier fecha' },
  ...PERIODOS.map((p) => ({ value: p.id, label: p.label })),
  { value: 'fechas', label: 'Elegir fechas…' },
];

/** Opción extra del Select "Periodo" cuando ya hay un rango: reabre el calendario. */
const CAMBIAR_FECHAS = '__cambiar_fechas';

const OPCIONES_REPORTES = [
  { value: '', label: 'Todos los reportes' },
  { value: 'abiertos', label: 'Con error reportado' },
];

/** Valor de la URL solo si es una opción conocida (si no, se ignora: ni Select vacío ni contado). */
const valido = (v: string | null, opciones: { value: string }[]) =>
  v && opciones.some((o) => o.value === v) ? v : '';

const OPCIONES_RESULTADO = [
  { value: '', label: 'Todos los resultados' },
  { value: 'DISCREPANCIES', label: 'Por revisar' },
  { value: 'OK', label: 'Todo coincide' },
  { value: 'ERROR', label: 'No se pudo comprobar' },
];

/**
 * Cada control cambia SOLO su parámetro de la URL; el buscador, a los 300 ms.
 * Móvil: 2 columnas sin panel escondido, para ver siempre qué filtros hay puestos.
 */
export function HistoryFilters({
  esAdmin,
  negocios,
  total,
}: {
  esAdmin: boolean;
  negocios: { slug: string; name: string }[];
  /** Resultados con los filtros actuales (texto del botón del diálogo móvil). */
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const buscadorId = BUSCADOR_ID;
  const buscadorRef = useRef<HTMLInputElement>(null);
  const negocioId = useId();
  const periodoId = useId();
  const resultadoId = useId();
  const reportesId = useId();

  const periodo = valido(sp.get('periodo') ?? (sp.get('from') || sp.get('to') ? 'fechas' : null), OPCIONES_PERIODO) || null;
  const status = valido(sp.get('status'), OPCIONES_RESULTADO);
  const reportes = esAdmin ? valido(sp.get('reportes'), OPCIONES_REPORTES) : '';
  // `negocios` solo llega con más de una farmacia visible (admin o personal que lleva varias).
  const negocio = negocios.length > 1 ? valido(sp.get('business'), negocios.map((n) => ({ value: n.slug }))) : '';
  const desde = sp.get('from') ?? '';
  const hasta = sp.get('to') ?? '';

  // Buscador: estado local + debounce. Si la URL cambia por otra vía (p. ej.
  // "Quitar filtros"), el campo se sincroniza; lo que acabamos de enviar no.
  const qUrl = sp.get('q') ?? sp.get('supplier') ?? '';
  const [texto, setTexto] = useState(qUrl);
  const [qVisto, setQVisto] = useState(qUrl);
  const [enviado, setEnviado] = useState(qUrl);
  if (qUrl !== qVisto) {
    setQVisto(qUrl);
    if (qUrl !== enviado) setTexto(qUrl);
  }
  const temporizador = useRef<number | undefined>(undefined);
  // "Elegir fechas…": en escritorio el calendario cuelga del propio Select "Periodo".
  const [abrirCalendario, setAbrirCalendario] = useState(false);
  // Móvil (diálogo de filtros): al elegir "Elegir fechas…" el foco pasa al calendario.
  const enfocarCalendario = useRef(false);
  const rangoMovilId = useId();
  useEffect(() => {
    // (abrirCalendario solo cuenta al montar el selector: no hace falta reiniciarlo)
    if (periodo !== 'fechas' || !enfocarCalendario.current) return;
    enfocarCalendario.current = false;
    const id = requestAnimationFrame(() => enfocarDia(document.getElementById(rangoMovilId)));
    return () => cancelAnimationFrame(id);
  }, [periodo, rangoMovilId]);

  function actualizar(cambios: Record<string, string | null>, modo: 'push' | 'replace' = 'push') {
    const params = new URLSearchParams(sp.toString());
    params.delete('page');
    params.delete('supplier'); // URL antigua: ahora es "q"
    for (const [k, v] of Object.entries(cambios)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    const qs = params.toString();
    router[modo](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function onBuscar(valor: string) {
    setTexto(valor);
    window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => {
      const limpio = valor.trim();
      setEnviado(limpio);
      actualizar({ q: limpio || null }, 'replace');
    }, 300);
  }

  function elegirPeriodo(id: string) {
    const escritorioYa = window.matchMedia('(min-width: 768px)').matches;
    // "Cambiar fechas…": reabre el calendario sin perder el rango actual
    if (id === CAMBIAR_FECHAS) {
      // Tras cerrarse el Select (devuelve el foco a su botón); si no, ese foco
      // "fuera" cerraría el calendario recién abierto.
      if (escritorioYa) window.setTimeout(() => setAbrirCalendario(true), 50);
      // Móvil: el calendario ya está en línea en el diálogo; solo llevamos el foco
      else window.setTimeout(() => enfocarDia(document.getElementById(rangoMovilId)), 50);
      return;
    }
    actualizar({ periodo: id || null, from: null, to: null });
    // Escritorio: el calendario se abre solo. Móvil: va en línea dentro del diálogo.
    const escritorio = window.matchMedia('(min-width: 768px)').matches;
    setAbrirCalendario(id === 'fechas' && escritorio);
    enfocarCalendario.current = id === 'fechas' && !escritorio;
  }

  const rango = periodo === 'fechas' ? resumenCorto(desde, hasta) : '';
  const opcionesPeriodo = OPCIONES_PERIODO.flatMap((o) =>
    o.value === 'fechas' && rango
      ? [{ value: 'fechas', label: rango }, { value: CAMBIAR_FECHAS, label: 'Cambiar fechas…' }]
      : [o],
  );

  const muestraNegocio = negocios.length > 1;
  const activos = [periodo, status, reportes, negocio].filter(Boolean).length;

  function quitarTodo() {
    window.clearTimeout(temporizador.current);
    setTexto('');
    setEnviado('');
    router.push(pathname, { scroll: false });
  }

  /**
   * Los Selects se pintan dos veces con ids distintos: en línea en escritorio
   * (etiqueta solo para lectores) y dentro del diálogo "Filtros" en móvil
   * (etiqueta visible; así los valores cortos se entienden y no se recortan).
   */
  const controles = (sufijo: string, etiquetaVisible: boolean) => {
    const etiqueta = cn(
      etiquetaVisible ? 'mb-1.5 block text-[14px] font-medium text-[var(--color-ink-2)]' : 'sr-only',
    );
    const caja = etiquetaVisible ? '' : 'md:w-[170px]';
    return (
      <>
        <div className={etiquetaVisible ? '' : 'md:w-[170px]'}>
          <label htmlFor={periodoId + sufijo} className={etiqueta}>
            Periodo
          </label>
          {etiquetaVisible ? (
            <Select id={periodoId + sufijo} value={periodo ?? ''} onValueChange={elegirPeriodo} options={opcionesPeriodo} />
          ) : (
            // Escritorio: el calendario cuelga del Select (sin un control extra en la barra)
            <DateRangePicker
              ancla={
                <Select id={periodoId + sufijo} value={periodo ?? ''} onValueChange={elegirPeriodo} options={opcionesPeriodo} />
              }
              abierto={periodo === 'fechas' && abrirCalendario}
              onAbiertoChange={setAbrirCalendario}
              idFocoAlCerrar={periodoId + sufijo}
              from={desde}
              to={hasta}
              onChange={(r) => actualizar({ periodo: 'fechas', from: r.from || null, to: r.to || null }, 'replace')}
            />
          )}
        </div>
        {periodo === 'fechas' &&
          etiquetaVisible && (
            <div id={rangoMovilId} role="group" aria-label="Fechas">
              <DateRangePicker
                enLinea
                from={desde}
                to={hasta}
                onChange={(r) => actualizar({ periodo: 'fechas', from: r.from || null, to: r.to || null }, 'replace')}
              />
            </div>
          )}
        <div className={etiquetaVisible ? '' : 'md:w-[190px]'}>
          <label htmlFor={resultadoId + sufijo} className={etiqueta}>
            Resultado
          </label>
          <Select
            id={resultadoId + sufijo}
            value={status}
            onValueChange={(v) => actualizar({ status: v || null })}
            options={OPCIONES_RESULTADO}
          />
        </div>
        {muestraNegocio && (
          <div className={etiquetaVisible ? '' : 'md:w-[180px]'}>
            <label htmlFor={negocioId + sufijo} className={etiqueta}>
              Farmacia
            </label>
            <Select
              id={negocioId + sufijo}
              value={negocio}
              onValueChange={(v) => actualizar({ business: v || null })}
              options={[{ value: '', label: 'Todas las farmacias' }, ...negocios.map((n) => ({ value: n.slug, label: n.name }))]}
            />
          </div>
        )}
        {esAdmin && (
          <div className={caja}>
            <label htmlFor={reportesId + sufijo} className={etiqueta}>
              Reportes de error
            </label>
            <Select
              id={reportesId + sufijo}
              value={reportes}
              onValueChange={(v) => actualizar({ reportes: v || null })}
              options={OPCIONES_REPORTES}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div role="search" aria-label="Filtrar conciliaciones" className="flex items-center gap-2 md:flex-wrap xl:flex-nowrap">
        <div className="relative min-w-0 flex-1 md:min-w-[220px] xl:min-w-[140px]">
          <label htmlFor={buscadorId} className="sr-only">
            Buscar por proveedor o nombre del envío
          </label>
          <NavIcon
            name="MagnifyingGlass"
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
          />
          <input
            id={buscadorId}
            ref={buscadorRef}
            type="search"
            value={texto}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder="Buscar proveedor…"
            autoComplete="off"
            className="field pl-9"
          />
        </div>
        <div className="hidden md:contents">{controles('', false)}</div>
        <div className="shrink-0 md:hidden">
          <FiltrosMovil
            activos={activos}
            resultados={total === 1 ? 'Ver 1 conciliación' : `Ver ${total} conciliaciones`}
            onQuitar={quitarTodo}
          >
            {controles('-movil', true)}
          </FiltrosMovil>
        </div>
      </div>

    </div>
  );
}
