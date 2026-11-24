'use client';

import { useId, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/shared/components/atoms/Select';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { FiltrosMovil } from '@/shared/components/molecules/FiltrosMovil';
import { OPCIONES_PERIODO, OPCIONES_RESULTADO, valido } from '../../lib/historialPrecios';

export const BUSCADOR_PRECIOS_ID = 'buscador-historial-precios';


/** Barra de filtros estándar: buscador (300 ms) + Periodo + Resultado, en la URL. */
export function HistorialFiltros({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const periodoId = useId();
  const resultadoId = useId();
  const periodo = valido(sp.get('periodo'), OPCIONES_PERIODO) ?? '';
  const resultado = valido(sp.get('resultado'), OPCIONES_RESULTADO) ?? '';

  const qUrl = sp.get('q') ?? '';
  const [texto, setTexto] = useState(qUrl);
  const [qVisto, setQVisto] = useState(qUrl);
  const [enviado, setEnviado] = useState(qUrl);
  if (qUrl !== qVisto) {
    setQVisto(qUrl);
    if (qUrl !== enviado) setTexto(qUrl);
  }
  const temporizador = useRef<number | undefined>(undefined);

  function actualizar(cambios: Record<string, string | null>, modo: 'push' | 'replace' = 'push') {
    const params = new URLSearchParams(sp.toString());
    params.delete('page');
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

  function quitarTodo() {
    window.clearTimeout(temporizador.current);
    setTexto('');
    setEnviado('');
    router.push(pathname, { scroll: false });
  }

  const controles = (sufijo: string, etiquetaVisible: boolean) => {
    const etiqueta = etiquetaVisible ? 'mb-1.5 block text-[14px] font-medium text-[var(--color-ink-2)]' : 'sr-only';
    return (
      <>
        <div className={etiquetaVisible ? '' : 'md:w-[180px]'}>
          <label htmlFor={periodoId + sufijo} className={etiqueta}>
            Periodo
          </label>
          <Select id={periodoId + sufijo} value={periodo} onValueChange={(v) => actualizar({ periodo: v || null })} options={OPCIONES_PERIODO} />
        </div>
        <div className={etiquetaVisible ? '' : 'md:w-[210px]'}>
          <label htmlFor={resultadoId + sufijo} className={etiqueta}>
            Resultado
          </label>
          <Select id={resultadoId + sufijo} value={resultado} onValueChange={(v) => actualizar({ resultado: v || null })} options={OPCIONES_RESULTADO} />
        </div>
      </>
    );
  };

  return (
    <div role="search" aria-label="Filtrar consultas de precios" className="flex items-center gap-2 md:flex-wrap xl:flex-nowrap">
      <div className="relative min-w-0 flex-1 md:min-w-[220px]">
        <label htmlFor={BUSCADOR_PRECIOS_ID} className="sr-only">
          Buscar por producto o código
        </label>
        <NavIcon name="MagnifyingGlass" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          id={BUSCADOR_PRECIOS_ID}
          type="search"
          value={texto}
          onChange={(e) => onBuscar(e.target.value)}
          placeholder="Buscar por producto o código"
          autoComplete="off"
          className="field pl-9"
        />
      </div>
      <div className="hidden md:contents">{controles('', false)}</div>
      <div className="shrink-0 md:hidden">
        <FiltrosMovil
          activos={[periodo, resultado].filter(Boolean).length}
          resultados={total === 1 ? 'Ver 1 consulta' : `Ver ${total} consultas`}
          onQuitar={quitarTodo}
        >
          {controles('-movil', true)}
        </FiltrosMovil>
      </div>
    </div>
  );
}

/** "Quitar filtros": navega sin filtros y deja el foco en el buscador. */
export function QuitarFiltrosPrecios({ className }: { className: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        router.push(pathname, { scroll: false });
        document.getElementById(BUSCADOR_PRECIOS_ID)?.focus();
      }}
    >
      <NavIcon name="X" size={14} />
      Quitar filtros
    </button>
  );
}
