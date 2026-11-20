import Link from 'next/link';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

/** Fila ya preparada en el servidor: coste y negocio solo llegan si es SUPER_ADMIN. */
export interface FilaHistorial {
  id: string;
  titulo: string;
  /** Solo si no es ya el título. */
  proveedor: string | null;
  hora: string;
  usuario: string;
  estado: 'OK' | 'DISCREPANCIES' | 'ERROR';
  numDiscrepancias: number;
  reporte: 'abierto' | 'resuelto' | null;
  negocio?: string;
  coste?: string;
}

export interface GrupoHistorial {
  ymd: string;
  etiqueta: string;
  filas: FilaHistorial[];
}

function estado(f: FilaHistorial): { texto: string; clase: string } {
  if (f.estado === 'ERROR') return { texto: 'No se pudo comprobar', clase: 'chip-red' };
  if (f.estado === 'OK' || f.numDiscrepancias === 0) return { texto: 'Todo coincide', clase: 'chip-green' };
  return { texto: `${f.numDiscrepancias} por revisar`, clase: 'chip-yellow' };
}

/** Historial agrupado por día. Cada fila es un único enlace a todo lo ancho. */
export function HistoryList({ grupos }: { grupos: GrupoHistorial[] }) {
  return (
    <div className="flex flex-col gap-6">
      {grupos.map((g) => (
        <section key={g.ymd} aria-labelledby={`dia-${g.ymd}`}>
          <h2 id={`dia-${g.ymd}`} className="m-0 mb-2 px-1 text-[14px] font-semibold text-[var(--color-ink-2)]">
            {g.etiqueta}
          </h2>
          <ul className="card divide-y divide-[var(--color-hairline)] overflow-hidden p-0">
            {g.filas.map((f) => {
              const e = estado(f);
              const meta = [f.proveedor, f.hora, f.usuario, f.negocio, f.coste].filter(Boolean).join(' · ');
              return (
                <li key={f.id}>
                  <Link
                    href={`/albaranes/historial/${f.id}`}
                    className="flex items-center gap-3 min-h-16 px-4 py-3 sm:px-5 hover:bg-[var(--color-surface-2)] transition-colors focus-visible:outline-offset-[-3px]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="min-w-0 max-w-full truncate text-[15px] font-semibold text-[var(--color-ink)]">
                          {f.titulo}
                        </span>
                        <span className={cn('chip shrink-0', e.clase)}>{e.texto}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-[var(--color-muted)]">
                        <span className="min-w-0 break-words">{meta}</span>
                        {f.reporte && (
                          <span className={cn('chip shrink-0', f.reporte === 'abierto' ? 'chip-yellow' : 'chip-neutral')}>
                            <NavIcon name="Flag" size={12} />
                            {f.reporte === 'abierto' ? 'Error reportado' : 'Reporte solucionado'}
                          </span>
                        )}
                      </span>
                    </span>
                    <NavIcon name="CaretRight" size={14} className="shrink-0 text-[var(--color-muted)]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
