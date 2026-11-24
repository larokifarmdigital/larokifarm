import type { ReactNode, Ref } from 'react';
import { Chip } from '@/shared/components/atoms/Chip';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { TIPO_PRODUCTO_LABEL, type Oferta, type Producto } from '@/core/precios/domain';
import { EUR, TIPO_TONO, cuando, mejorVerificado } from '../../lib/precios';

/** Cabecera del resultado: producto, mejor precio verificado y resumen. */
export function TarjetaProducto({
  producto,
  ofertas,
  totalFarmacias,
  terminado,
  creadaEn,
  accion,
  tituloRef,
  nombresFarmacia,
  esTituloDePagina = false,
  volver,
}: {
  producto: Producto;
  ofertas: Oferta[];
  totalFarmacias: number;
  terminado: boolean;
  creadaEn: string;
  accion?: ReactNode;
  tituloRef?: Ref<HTMLHeadingElement>;
  nombresFarmacia: Record<string, string>;
  /** En el detalle del historial no hay PageHeader: el producto es el h1. */
  esTituloDePagina?: boolean;
  /** Enlace encima del título para volver a la lista de candidatos. */
  volver?: ReactNode;
}) {
  const Titulo = esTituloDePagina ? 'h1' : 'h2';
  const receta = producto.tipo === 'receta';
  const mejor = mejorVerificado(ofertas);
  const conPrecio = ofertas.filter((o) => o.estado === 'verificado' && o.precio != null);
  const donde = conPrecio.filter((o) => mejor != null && Math.abs((o.precio as number) - mejor) < 0.005).map((o) => nombresFarmacia[o.farmacia] ?? o.farmacia);

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="producto-titulo">
      {volver && <div className="-mt-1 mb-2">{volver}</div>}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <Titulo id="producto-titulo" ref={tituloRef} tabIndex={-1} className="m-0 text-[18px] sm:text-[19px] font-semibold text-[var(--color-ink)] leading-snug focus:outline-none">
            {producto.nombre}
          </Titulo>
          <p className="m-0 mt-1 text-[13.5px] text-[var(--color-ink-2)] flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="tabular-nums">CN {producto.cn}</span>
            {producto.ean && (
              <span className="tabular-nums">
                <span aria-hidden>· </span>
                Código de barras {producto.ean}
              </span>
            )}
            <Chip tone={TIPO_TONO[producto.tipo]}>{TIPO_PRODUCTO_LABEL[producto.tipo]}</Chip>
          </p>
        </div>
        {accion && <div className="hidden sm:block shrink-0">{accion}</div>}
      </div>

      {!receta && (
        <div className="mt-5 rounded-[10px] bg-[var(--color-surface-2)] px-4 py-3.5">
          {!terminado ? (
            <p className="m-0 text-[14px] text-[var(--color-ink-2)] inline-flex items-center gap-2">
              <NavIcon name="MagnifyingGlass" size={16} />
              Consultando farmacias… han respondido {ofertas.length} de {totalFarmacias}
            </p>
          ) : mejor != null ? (
            <>
              <p className="m-0 text-[13px] font-medium text-[var(--color-ink-2)]">Mejor precio verificado</p>
              <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="text-[26px] font-semibold tabular-nums text-[var(--color-ink)] leading-none">{EUR.format(mejor)}</span>
                <span className="text-[14px] text-[var(--color-ink-2)]">{donde.join(', ')}</span>
              </p>
            </>
          ) : (
            <>
              <p className="m-0 text-[15px] font-medium text-[var(--color-ink-2)]">Sin precio verificado</p>
              <p className="m-0 mt-1 text-[13.5px] text-[var(--color-muted)]">Ninguna farmacia muestra este código en su ficha.</p>
            </>
          )}
        </div>
      )}

      <p className="m-0 mt-3 text-[13px] text-[var(--color-muted)]">
        {!receta && terminado && (
          <>
            {conPrecio.length} de {totalFarmacias} farmacias con precio verificado ·{' '}
          </>
        )}
        Consultado <time dateTime={creadaEn}>{cuando(creadaEn)}</time>
      </p>
      {accion && <div className="mt-4 sm:hidden">{accion}</div>}
    </section>
  );
}

/** Con receta: no se vende online; solo el precio oficial del Ministerio. */
export function AvisoReceta({ precioOficial }: { precioOficial: number | null }) {
  return (
    <section className="card p-5 sm:p-6 border-[var(--color-yellow-ink)]/40" aria-labelledby="aviso-receta">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-[var(--color-yellow-ink)]" aria-hidden>
          <NavIcon name="Prohibit" size={22} />
        </span>
        <div>
          <h2 id="aviso-receta" className="m-0 text-[16px] font-semibold text-[var(--color-ink)]">
            Medicamento con receta: no se vende online
          </h2>
          <p className="m-0 mt-1 text-[14px] text-[var(--color-ink-2)] leading-relaxed">
            En España los medicamentos con receta solo se venden en la farmacia, así que no lo buscamos en otras webs.
          </p>
          {precioOficial != null ? (
            <>
              <p className="m-0 mt-3 text-[15px] text-[var(--color-ink)]">
                Precio oficial: <strong className="tabular-nums">{EUR.format(precioOficial)}</strong>
              </p>
              <p className="m-0 mt-0.5 text-[13px] text-[var(--color-muted)]">Lista oficial del Ministerio de Sanidad.</p>
            </>
          ) : (
            <>
              <p className="m-0 mt-3 text-[15px] text-[var(--color-ink)]">Precio oficial no disponible</p>
              <p className="m-0 mt-0.5 text-[13px] text-[var(--color-muted)]">El Ministerio no publica un precio para este medicamento.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
