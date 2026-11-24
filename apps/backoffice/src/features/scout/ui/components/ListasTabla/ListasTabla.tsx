'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/shared/components/atoms/Button';
import { Chip } from '@/shared/components/atoms/Chip';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import { fechaFila } from '@/shared/lib/fechasMadrid';
import type { ListaResumen } from '@/core/precios/domain';
import { AccionesLista } from '../AccionesLista';
import { SubirListaDialog } from '../SubirListaDialog';
import { ESTADO_EJECUCION_LABEL, ESTADO_EJECUCION_TONO, activa, estadoVisible, lineaUltima, numero } from '../../lib/listas';

const sinAcentos = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Botón de la cabecera: abre el modal (también con /scout/listas?nueva=1). */
export function SubirListaBoton() {
  const sp = useSearchParams();
  const router = useRouter();
  const [abierto, setAbierto] = useState(sp.get('nueva') === '1');
  useEffect(() => {
    if (sp.get('nueva') === '1') router.replace('/scout/listas', { scroll: false });
  }, [sp, router]);
  return (
    <>
      <Button type="button" variant="accent" onClick={() => setAbierto(true)}>
        <NavIcon name="UploadSimple" size={16} />
        Subir lista
      </Button>
      <SubirListaDialog open={abierto} onOpenChange={setAbierto} />
    </>
  );
}

function EstadoUltima({ l }: { l: ListaResumen }) {
  if (!l.ultima) return <span className="text-[var(--color-muted)]">Sin comparar</span>;
  const v = estadoVisible(l.ultima);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <Chip tone={ESTADO_EJECUCION_TONO[v]}>{ESTADO_EJECUCION_LABEL[v]}</Chip>
      <span className="tabular-nums text-[var(--color-ink-2)]">{lineaUltima(l.ultima)}</span>
    </span>
  );
}

const excelDe = (l: ListaResumen) => (l.ultima && l.ultima.hechos > 0 ? l.ultima.id : null);

export function ListasTabla({ listas, esAdmin }: { listas: ListaResumen[]; esAdmin: boolean }) {
  const [texto, setTexto] = useState('');
  const visibles = useMemo(() => {
    const t = sinAcentos(texto.trim());
    return t ? listas.filter((l) => sinAcentos(`${l.nombre} ${l.archivo}`).includes(t)) : listas;
  }, [texto, listas]);

  if (listas.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 px-5 py-12 text-center">
        <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <NavIcon name="ListChecks" size={22} />
        </span>
        <h2 className="m-0 text-[17px] font-bold text-[var(--color-ink)]">Aún no has subido ninguna lista</h2>
        <p className="m-0 max-w-md text-[14.5px] leading-[1.5] text-[var(--color-muted)]">
          Sube un Excel con una columna de códigos nacionales. Antes de guardarla te enseñamos qué filas valen.
        </p>
        <Button asChild variant="accent">
          <Link href="/scout/listas?nueva=1">Subir lista</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div role="search" aria-label="Buscar listas" className="mb-3">
        <div className="relative max-w-md">
          <label htmlFor="buscador-listas" className="sr-only">
            Buscar lista
          </label>
          <NavIcon name="MagnifyingGlass" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input id="buscador-listas" type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar lista…" autoComplete="off" className="field pl-9" />
        </div>
      </div>
      <div className="mb-3 flex min-h-11 items-center justify-between gap-3 px-1">
        <p role="status" className="m-0 text-[14px] text-[var(--color-muted)]">
          {visibles.length ? `${visibles.length} ${visibles.length === 1 ? 'lista' : 'listas'}` : ''}
        </p>
        {texto && (
          <button
            type="button"
            onClick={() => {
              setTexto('');
              document.getElementById('buscador-listas')?.focus();
            }}
            className="inline-flex min-h-11 sm:min-h-9 items-center gap-1.5 rounded-[8px] px-3 text-[14px] font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)]"
          >
            <NavIcon name="X" size={14} />
            Quitar filtros
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <div className="card px-5 py-10 text-center">
          <p className="m-0 text-[15px] font-semibold text-[var(--color-ink)]">Ninguna lista coincide con «{texto}»</p>
        </div>
      ) : (
        <>
          <div className="card hidden overflow-hidden p-0 xl:block">
            <table className="w-full text-left text-[14px]">
              <caption className="sr-only">Listas de productos</caption>
              <thead>
                <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[12.5px] text-[var(--color-muted)]">
                  <th scope="col" className="px-5 py-2.5 font-semibold">Lista</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Última comparación</th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">Subida</th>
                  <th scope="col" className="w-14 px-5 py-2.5"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-hairline)]">
                {visibles.map((l) => (
                  <tr key={l.id} className="relative transition-colors hover:bg-[var(--color-surface-2)]">
                    <td className="px-5 py-3">
                      <Link
                        href={`/scout/listas/${l.id}`}
                        className={cn(
                          'inline-flex min-h-6 items-center font-semibold text-[var(--color-ink)] break-words',
                          "after:absolute after:inset-0 after:content-['']",
                          'focus-visible:outline-none focus-visible:underline focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-[var(--color-accent)]',
                        )}
                      >
                        {l.nombre}
                      </Link>
                      <span className="block text-[13px] text-[var(--color-muted)]">
                        {numero(l.productos)} productos · {l.archivo}
                      </span>
                    </td>
                    <td className="px-3 py-3"><EstadoUltima l={l} /></td>
                    <td className="relative px-3 py-3 whitespace-nowrap text-[var(--color-ink-2)]">
                      {fechaFila(new Date(l.creadaEn)).corta.split(' · ')[0]}
                      {esAdmin && l.autor && <span className="block text-[13px] text-[var(--color-muted)]">{l.autor}</span>}
                    </td>
                    <td className="relative px-5 py-3 text-right">
                      <AccionesLista lista={l} excelRunId={excelDe(l)} activa={activa(l.ultima)} ejecuciones={l.ultima ? 1 : 0} trasEliminar="refrescar" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="card divide-y divide-[var(--color-hairline)] overflow-hidden p-0 xl:hidden">
            {visibles.map((l) => (
              <li key={l.id} className="relative flex items-start gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/scout/listas/${l.id}`}
                    className="block break-words rounded-[4px] text-[15px] font-semibold text-[var(--color-ink)] after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] focus-visible:underline"
                  >
                    {l.nombre}
                  </Link>
                  <span className="block text-[13px] text-[var(--color-muted)]">{numero(l.productos)} productos</span>
                  <span className="mt-1.5 block text-[13px]"><EstadoUltima l={l} /></span>
                </div>
                <div className="relative shrink-0">
                  <AccionesLista lista={l} excelRunId={excelDe(l)} activa={activa(l.ultima)} ejecuciones={l.ultima ? 1 : 0} trasEliminar="refrescar" />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
