'use client';

import { useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select } from '@/shared/components/atoms/Select';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { FiltrosMovil } from '@/shared/components/molecules/FiltrosMovil';
import { OPCIONES_RESULTADO_LISTA, valido } from '../../lib/historialPrecios';

export const BUSCADOR_RESULTADOS_ID = 'buscador-resultados';

/** Buscador (300 ms) + "Resultado". Conserva `run` en la URL. */
export function ResultadosFiltros({ total, conPendientes }: { total: number; conPendientes: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const opciones = OPCIONES_RESULTADO_LISTA.filter((o) => o.value !== 'pendiente' || conPendientes);
  const resultado = valido(sp.get('resultado'), opciones) ?? '';
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

  const controles = (sufijo: string, visible: boolean) => (
    <div className={visible ? '' : 'md:w-[210px]'}>
      <label htmlFor={`resultado-lista${sufijo}`} className={visible ? 'mb-1.5 block text-[14px] font-medium text-[var(--color-ink-2)]' : 'sr-only'}>
        Resultado
      </label>
      <Select id={`resultado-lista${sufijo}`} value={resultado} onValueChange={(v) => actualizar({ resultado: v || null })} options={opciones} />
    </div>
  );

  return (
    <div role="search" aria-label="Filtrar resultados" className="flex items-center gap-2 md:flex-wrap">
      <div className="relative min-w-0 flex-1 md:min-w-[220px]">
        <label htmlFor={BUSCADOR_RESULTADOS_ID} className="sr-only">
          Buscar por nombre o código nacional
        </label>
        <NavIcon name="MagnifyingGlass" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          id={BUSCADOR_RESULTADOS_ID}
          type="search"
          value={texto}
          placeholder="Buscar por nombre o código nacional"
          autoComplete="off"
          className="field pl-9"
          onChange={(e) => {
            const valor = e.target.value;
            setTexto(valor);
            window.clearTimeout(temporizador.current);
            temporizador.current = window.setTimeout(() => {
              setEnviado(valor.trim());
              actualizar({ q: valor.trim() || null }, 'replace');
            }, 300);
          }}
        />
      </div>
      <div className="hidden md:contents">{controles('', false)}</div>
      <div className="shrink-0 md:hidden">
        <FiltrosMovil
          activos={resultado ? 1 : 0}
          resultados={total === 1 ? 'Ver 1 producto' : `Ver ${total} productos`}
          onQuitar={() => actualizar({ resultado: null, q: null })}
        >
          {controles('-movil', true)}
        </FiltrosMovil>
      </div>
    </div>
  );
}

export function QuitarFiltrosResultados({ className }: { className: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const run = sp.get('run');
        router.push(run ? `${pathname}?run=${run}` : pathname, { scroll: false });
        document.getElementById(BUSCADOR_RESULTADOS_ID)?.focus();
      }}
    >
      <NavIcon name="X" size={14} />
      Quitar filtros
    </button>
  );
}
