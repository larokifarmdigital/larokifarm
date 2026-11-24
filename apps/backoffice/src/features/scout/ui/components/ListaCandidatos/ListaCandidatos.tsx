import type { Ref } from 'react';
import { Chip } from '@/shared/components/atoms/Chip';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { TIPO_PRODUCTO_LABEL, type Candidato } from '@/core/precios/domain';
import { TIPO_TONO } from '../../lib/precios';

/** Búsqueda por nombre: el usuario elige el producto (botones nativos: Tab + Intro). */
export function ListaCandidatos({
  candidatos,
  hayMas,
  texto,
  onElegir,
  tituloRef,
  deshabilitado,
}: {
  candidatos: Candidato[];
  hayMas: boolean;
  texto: string;
  onElegir: (c: Candidato) => void;
  tituloRef?: Ref<HTMLHeadingElement>;
  deshabilitado?: boolean;
}) {
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="candidatos-titulo">
      <h2 id="candidatos-titulo" ref={tituloRef} tabIndex={-1} className="m-0 text-[17px] font-semibold text-[var(--color-ink)] focus:outline-none">
        Elige el producto
      </h2>
      <p className="m-0 mt-1 text-[14px] text-[var(--color-ink-2)]">
        {candidatos.length} {candidatos.length === 1 ? 'producto' : 'productos'} con «{texto}». Elige el que buscas.
      </p>
      <ul className="m-0 mt-4 p-0 list-none flex flex-col gap-2">
        {candidatos.map((c) => (
          <li key={c.cn}>
            <button
              type="button"
              onClick={() => onElegir(c)}
              aria-disabled={deshabilitado || undefined}
              className="w-full min-h-11 flex items-center gap-3 rounded-[10px] border border-[var(--color-control-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-left hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition-colors"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-[var(--color-ink)]">{c.nombre}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[13px] text-[var(--color-ink-2)]">
                  <span className="tabular-nums">CN {c.cn}</span>
                  <Chip tone={TIPO_TONO[c.tipo]}>{TIPO_PRODUCTO_LABEL[c.tipo]}</Chip>
                </span>
              </span>
              <NavIcon name="CaretRight" size={16} className="text-[var(--color-muted)] shrink-0" />
            </button>
          </li>
        ))}
      </ul>
      {hayMas && (
        <p className="m-0 mt-3 text-[13.5px] text-[var(--color-muted)]">
          Hay más de {candidatos.length} productos. Escribe alguna palabra más (formato, tamaño…).
        </p>
      )}
    </section>
  );
}
