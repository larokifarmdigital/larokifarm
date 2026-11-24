import { Chip } from '@/shared/components/atoms/Chip';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { LabelHelpIcon } from '@/shared/components/molecules/LabelHelpIcon';
import { cn } from '@/shared/lib/cn';
import type { EstadoOferta, Oferta } from '@/core/precios/domain';
import { ESTADO_AYUDA, ESTADO_LABEL, ESTADO_TONO, EUR, esAtipico, esMasBarata, mejorVerificado, ordenarOfertas } from '../../lib/precios';

export type FilaPrecio = {
  clave: string;
  nombre: string;
  /** undefined = todavía consultando. */
  oferta?: Oferta;
};

const ESTADOS: EstadoOferta[] = ['verificado', 'sin_codigo', 'no_encontrado', 'bloquea', 'error'];

function AyudaEstados() {
  return (
    <LabelHelpIcon ariaLabel="Qué significa cada estado">
      <ul className="m-0 p-0 list-none flex flex-col gap-1">
        {ESTADOS.map((e) => (
          <li key={e}>
            <strong>{ESTADO_LABEL[e]}:</strong> {ESTADO_AYUDA[e]}
          </li>
        ))}
      </ul>
    </LabelHelpIcon>
  );
}

function Precio({ o, barata, atipico }: { o: Oferta; barata: boolean; atipico: boolean }) {
  if (o.precio == null || (o.estado !== 'verificado' && o.estado !== 'sin_codigo')) {
    return <span className="text-[var(--color-muted)]">—</span>;
  }
  const verificado = o.estado === 'verificado';
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className="inline-flex items-center gap-2 flex-wrap justify-end">
        {o.precioAntes != null && (
          <s className="text-[13px] text-[var(--color-muted)] tabular-nums">
            <span className="sr-only">antes </span>
            {EUR.format(o.precioAntes)}
          </s>
        )}
        <span
          className={cn(
            'tabular-nums',
            verificado ? 'text-[var(--color-ink)]' : 'text-[var(--color-muted)]',
            barata && 'font-semibold',
          )}
        >
          {o.precioAntes != null && <span className="sr-only">ahora </span>}
          {EUR.format(o.precio)}
        </span>
        {barata && <Chip tone="green">Más barato</Chip>}
      </span>
      {!verificado && (
        <span className="text-[12.5px] text-[var(--color-muted)]">Puede ser otro formato. Compruébalo en la ficha.</span>
      )}
      {atipico && (
        <span className="text-[12.5px] text-[var(--color-yellow-ink)]">Precio muy distinto al resto: revisa la ficha.</span>
      )}
    </span>
  );
}

function EnlaceFicha({ o, nombre, className }: { o: Oferta; nombre: string; className?: string }) {
  if (!o.url) return null;
  return (
    <a
      href={o.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1.5 min-h-11 sm:min-h-8 text-[14px] font-medium text-[var(--color-accent)] hover:underline underline-offset-[3px]',
        className,
      )}
    >
      Ver ficha
      <span className="sr-only"> de {nombre} (se abre en otra pestaña)</span>
      <NavIcon name="ArrowSquareOut" size={15} />
    </a>
  );
}

function Estado({ o }: { o?: Oferta }) {
  if (!o) {
    return (
      <Chip tone="neutral" className="inline-flex items-center gap-1.5">
        <span aria-hidden className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none" />
        Buscando…
      </Chip>
    );
  }
  return <Chip tone={ESTADO_TONO[o.estado]}>{ESTADO_LABEL[o.estado]}</Chip>;
}

/**
 * Precio en cada farmacia. Mientras se consulta, orden fijo (no saltan las
 * filas); al terminar, se ordenan UNA vez: verificadas de más barata a más
 * cara y después el resto. Solo una verificada puede ser "Más barato".
 */
export function TablaPrecios({ filas, terminado }: { filas: FilaPrecio[]; terminado: boolean }) {
  const ofertas = filas.flatMap((f) => (f.oferta ? [f.oferta] : []));
  const mejor = mejorVerificado(ofertas);
  const ordenadas = terminado
    ? ordenarOfertas(filas.map((f) => ({ ...f, estado: f.oferta?.estado ?? 'error', precio: f.oferta?.precio ?? null })))
    : filas;

  return (
    <div aria-busy={!terminado}>
      {/* Escritorio */}
      <table className="hidden md:table w-full text-[14px] border-collapse">
        <caption className="sr-only">
          Precio en {filas.length} farmacias online: primero las verificadas, de más barata a más cara
        </caption>
        <thead className="bg-[var(--color-surface-2)] text-[12.5px] font-semibold text-[var(--color-muted)]">
          <tr>
            <th scope="col" className="text-left px-4 py-2.5">Farmacia</th>
            <th scope="col" className="text-right px-4 py-2.5">Precio</th>
            <th scope="col" className="text-left px-4 py-2.5">
              <span className="inline-flex items-center gap-1.5">
                Estado <AyudaEstados />
              </span>
            </th>
            <th scope="col" className="px-4 py-2.5"><span className="sr-only">Ficha</span></th>
          </tr>
        </thead>
        <tbody>
          {ordenadas.map((f) => {
            const barata = terminado && !!f.oferta && esMasBarata(f.oferta, mejor);
            return (
              <tr key={f.clave} className={cn('border-t border-[var(--color-hairline)]', barata && 'bg-[var(--color-green-soft)]/50')}>
                <th scope="row" className="text-left font-medium text-[var(--color-ink)] px-4 py-3">{f.nombre}</th>
                <td className="text-right px-4 py-3">
                  {f.oferta ? <Precio o={f.oferta} barata={barata} atipico={terminado && esAtipico(f.oferta, ofertas)} /> : <span aria-hidden className="inline-block h-3.5 w-16 rounded bg-[var(--color-surface-sunken)]" />}
                </td>
                <td className="px-4 py-3"><Estado o={f.oferta} /></td>
                <td className="px-4 py-3 text-right">{f.oferta && <EnlaceFicha o={f.oferta} nombre={f.nombre} />}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Móvil: una tarjeta por farmacia */}
      <ul className="md:hidden m-0 p-0 list-none flex flex-col gap-2.5" aria-label={`Precio en ${filas.length} farmacias online`}>
        {ordenadas.map((f) => {
          const barata = terminado && !!f.oferta && esMasBarata(f.oferta, mejor);
          return (
            <li
              key={f.clave}
              className={cn(
                'rounded-[10px] border px-3.5 pt-3 pb-1',
                barata ? 'border-[var(--color-green-ink)] bg-[var(--color-green-soft)]/50' : 'border-[var(--color-hairline-strong)]',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium text-[15px] text-[var(--color-ink)]">{f.nombre}</span>
                {f.oferta ? <Precio o={f.oferta} barata={barata} atipico={terminado && esAtipico(f.oferta, ofertas)} /> : <span aria-hidden className="inline-block h-3.5 w-16 mt-1 rounded bg-[var(--color-surface-sunken)]" />}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[13px] text-[var(--color-ink-2)]">
                <Estado o={f.oferta} />
              </div>
              {f.oferta?.url ? <EnlaceFicha o={f.oferta} nombre={f.nombre} className="w-full" /> : <div className="h-2" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
