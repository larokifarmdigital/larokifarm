import Link from 'next/link';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

/** Fila ya preparada en el servidor: la farmacia solo llega si es SUPER_ADMIN. */
export interface FilaHistorial {
  id: string;
  /** Proveedor (como en Inicio). */
  titulo: string;
  /** Nombre del envío, si no es ya el título. */
  envio: string | null;
  /** "Hoy · 11:14", "Jue 19 nov · 11:14". */
  fecha: string;
  /** "Jueves 19 nov a las 11:14" (para el nombre accesible). */
  fechaLarga: string;
  usuario: string;
  estado: 'OK' | 'DISCREPANCIES' | 'ERROR';
  numDiscrepancias: number;
  reporte: 'abierto' | 'resuelto' | null;
  negocio?: string;
}

function estado(f: FilaHistorial): { texto: string; clase: string } {
  if (f.estado === 'ERROR') return { texto: 'No se pudo comprobar', clase: 'chip-red' };
  if (f.estado === 'OK' || f.numDiscrepancias === 0) return { texto: 'Todo coincide', clase: 'chip-green' };
  return { texto: `${f.numDiscrepancias} por revisar`, clase: 'chip-yellow' };
}

function ChipReporte({ reporte }: { reporte: FilaHistorial['reporte'] }) {
  if (!reporte) return null;
  return (
    <span className={cn('chip shrink-0 whitespace-nowrap', reporte === 'abierto' ? 'chip-yellow' : 'chip-neutral')}>
      <NavIcon name="Flag" size={12} />
      {reporte === 'abierto' ? 'Error reportado' : 'Reporte solucionado'}
    </span>
  );
}

const href = (f: FilaHistorial) => `/albaranes/historial/${f.id}`;

/**
 * Historial, de la más reciente a la más antigua.
 * - Escritorio (xl+): tabla (mismo thead que Usuarios/Farmacias) con columna
 *   "Fecha". Cada fila tiene UN enlace (el proveedor) "estirado" a toda la
 *   fila; las celdas de texto (fecha, quién, farmacia) quedan por encima para
 *   poder seleccionarlas.
 * - Por debajo de xl: tarjetas compactas, cada una un único enlace.
 */
export function HistoryList({ filas, conFarmacia }: { filas: FilaHistorial[]; conFarmacia: boolean }) {
  return (
    <>
      {/* Escritorio: tabla */}
      <div className="card hidden overflow-hidden p-0 xl:block">
        {/* Red de seguridad: si la tabla no cabe (menú lateral abierto, zoom), se desplaza dentro de la tarjeta */}
        <div className="overflow-x-auto" role="region" aria-label="Historial de conciliaciones" tabIndex={0}>
          <table className="w-full text-left text-[14px]">
            <caption className="sr-only">Conciliaciones, de la más reciente a la más antigua</caption>
            <thead>
              <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[12.5px] text-[var(--color-muted)]">
                <th scope="col" className="px-5 py-2.5 font-semibold">Proveedor</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Fecha</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Resultado</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Reportes</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Quién</th>
                {conFarmacia && <th scope="col" className="px-3 py-2.5 font-semibold">Farmacia</th>}
                <th scope="col" className="w-10 px-5 py-2.5">
                  <span className="sr-only">Abrir</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-hairline)]">
              {filas.map((f) => {
                const e = estado(f);
                return (
                  <tr key={f.id} className="relative transition-colors hover:bg-[var(--color-surface-2)]">
                    <td className="px-5 py-3">
                      <Link
                        href={href(f)}
                        className={cn(
                          'inline-flex min-h-6 min-w-6 items-center font-semibold text-[var(--color-ink)] break-words',
                          // Enlace estirado: toda la fila abre el detalle; el anillo de foco rodea la fila.
                          "after:absolute after:inset-0 after:content-['']",
                          'focus-visible:outline-none focus-visible:underline focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-[var(--color-accent)]',
                        )}
                      >
                        {f.titulo}
                        <span className="sr-only">, {f.fechaLarga}</span>
                      </Link>
                      {f.envio && <span className="block text-[13px] text-[var(--color-muted)] break-words">{f.envio}</span>}
                    </td>
                    <td className="relative px-3 py-3 whitespace-nowrap tabular-nums text-[var(--color-ink-2)]">{f.fecha}</td>
                    <td className="px-3 py-3">
                      <span className={cn('chip whitespace-nowrap', e.clase)}>{e.texto}</span>
                    </td>
                    <td className="px-3 py-3">
                      <ChipReporte reporte={f.reporte} />
                    </td>
                    <td className="relative px-3 py-3 text-[var(--color-ink-2)]">{f.usuario}</td>
                    {conFarmacia && <td className="relative px-3 py-3 text-[var(--color-ink-2)]">{f.negocio}</td>}
                    <td className="px-5 py-3 text-right">
                      <NavIcon name="CaretRight" size={14} className="inline-block text-[var(--color-muted)]" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Móvil y pantallas medianas: tarjetas */}
      <ul className="card divide-y divide-[var(--color-hairline)] overflow-hidden p-0 xl:hidden">
        {filas.map((f) => {
          const e = estado(f);
          const meta = [f.fecha, f.usuario, f.negocio].filter(Boolean).join(' · ');
          return (
            <li key={f.id}>
              <Link
                href={href(f)}
                className="flex items-center gap-3 min-h-16 px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors focus-visible:outline-offset-[-3px]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-[15px] font-semibold text-[var(--color-ink)]">{f.titulo}</span>
                  {f.envio && <span className="block break-words text-[13px] text-[var(--color-muted)]">{f.envio}</span>}
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className={cn('chip shrink-0', e.clase)}>{e.texto}</span>
                    <ChipReporte reporte={f.reporte} />
                  </span>
                  <span className="mt-1 block text-[13px] text-[var(--color-muted)]">{meta}</span>
                </span>
                <NavIcon name="CaretRight" size={14} className="shrink-0 text-[var(--color-muted)]" />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
