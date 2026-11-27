'use client';

import { useId, useRef, useState } from 'react';
import type { ReconciledLine } from '@/core/engine';
import type { Role } from '@/core/shared';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import { ReconciliationTable } from '../ReconciliationTable';
import { ReportarError, ReportsList, type ReportView } from '../ReportsSection';
import { FilePreviewModal, type PreviewFile } from '../FilePreviewModal';
import { CLASE_TONO, chipsResumen, resumirLineas } from '../../lib/lineas';
import { BTN_ACCENT, BTN_SECUNDARIO } from '../../lib/botones';

export interface HistoryResultCardProps {
  comparisonId: string;
  titulo: string;
  /** Línea bajo el título: proveedor · fecha · usuario (y negocio para el admin). */
  meta: string;
  estado: 'OK' | 'DISCREPANCIES' | 'ERROR';
  numDiscrepancias: number;
  /** null = conciliación antigua que no guardó las líneas (solo está el Excel). */
  lineas: ReconciledLine[] | null;
  mensajeError: string | null;
  informeUrl: string | null;
  archivos: PreviewFile[];
  initialReports: ReportView[];
  currentUser: { id: string; role: Role };
}

/**
 * Detalle de una conciliación del historial. Calca la tarjeta de resultado de
 * "Nueva conciliación" (mismo estado, chips, tabla y acciones) para que el
 * usuario reconozca lo que vio al comprobarla.
 */
export function HistoryResultCard({
  comparisonId,
  titulo,
  meta,
  estado,
  numDiscrepancias,
  lineas,
  mensajeError,
  informeUrl,
  archivos,
  initialReports,
  currentUser,
}: HistoryResultCardProps) {
  const [reportes, setReportes] = useState(initialReports);
  const [verArchivos, setVerArchivos] = useState(false);
  const verArchivosRef = useRef<HTMLButtonElement>(null);

  const resumen = lineas ? resumirLineas(lineas) : null;
  const chips = resumen ? chipsResumen(resumen) : [];
  const porRevisar = resumen ? resumen.porRevisar : numDiscrepancias;
  const errorProceso = estado === 'ERROR';
  const ok = !errorProceso && porRevisar === 0;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <article className="card p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <h1 className="m-0 break-words text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] text-[var(--color-ink)]">
              {titulo}
            </h1>
            <p className="m-0 mt-1 text-[14px] text-[var(--color-muted)]">{meta}</p>
            <p
              className={cn(
                'm-0 mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-semibold',
                errorProceso ? CLASE_TONO.falta : ok ? CLASE_TONO.ok : CLASE_TONO.diferencia,
              )}
            >
              <NavIcon name={ok ? 'Check' : 'Warning'} size={15} />
              {errorProceso
                ? 'No se pudo comprobar'
                : ok
                  ? 'Todo coincide'
                  : `${porRevisar} ${porRevisar === 1 ? 'cosa por revisar' : 'cosas por revisar'}`}
            </p>
            {chips.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <li key={c.texto} className={cn('rounded-[6px] px-2 py-0.5 text-[13px] font-medium', CLASE_TONO[c.tono])}>
                    {c.texto}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:shrink-0 lg:justify-end">
            {informeUrl && (
              <a href={informeUrl} download className={BTN_ACCENT}>
                <NavIcon name="DownloadSimple" size={17} />
                Descargar informe
              </a>
            )}
            {archivos.length > 0 && (
              <button aria-haspopup="dialog" ref={verArchivosRef} type="button" onClick={() => setVerArchivos(true)} className={BTN_SECUNDARIO}>
                Ver archivos ({archivos.length})
              </button>
            )}
            <ReportarError comparisonId={comparisonId} onCreado={(nuevo) => setReportes((prev) => [nuevo, ...prev])} />
          </div>
        </div>

        {mensajeError && (
          <p className="m-0 mt-4 rounded-[8px] bg-[var(--color-red-soft)] px-3 py-2.5 text-[14px] text-[var(--color-red-ink)]">
            {mensajeError}
          </p>
        )}
      </article>

      {!errorProceso && <TarjetaLineas lineas={lineas} />}

      <ReportsList
        reports={reportes}
        isSuperAdmin={currentUser.role === 'SUPER_ADMIN'}
        nivel={2}
        enTarjeta
        onResuelto={(res) => setReportes((prev) => prev.map((x) => (x.id === res.id ? res : x)))}
      />

      {verArchivos && (
        <FilePreviewModal files={archivos} onClose={() => setVerArchivos(false)} devolverFocoA={verArchivosRef} />
      )}
    </div>
  );
}

/**
 * Tarjeta de líneas (compartida con el resultado de "Nueva conciliación"):
 * título propio y la tabla con su filtro "Mostrar todas las líneas".
 */
export function TarjetaLineas({ lineas, nivel = 2 }: { lineas: ReconciledLine[] | null; nivel?: 2 | 3 }) {
  const Titulo = nivel === 2 ? 'h2' : 'h3';
  const tituloId = useId();
  return (
    <section aria-labelledby={tituloId} className="card overflow-hidden p-0">
      <div className="px-4 pt-4 pb-3 sm:px-5 sm:pt-5">
        <Titulo id={tituloId} className="m-0 text-[17px] font-bold tracking-[-0.01em] text-[var(--color-ink)]">Qué ha llegado</Titulo>
        <p className="m-0 mt-0.5 text-[14px] text-[var(--color-muted)]">Tu pedido comparado con el albarán, línea a línea.</p>
      </div>
      {lineas && lineas.length > 0 ? (
        <div className="border-t border-[var(--color-hairline)]">
          <ReconciliationTable lines={lineas} />
        </div>
      ) : (
        <p className="m-0 border-t border-[var(--color-hairline)] px-4 py-5 sm:px-5 text-[14px] text-[var(--color-muted)]">
          Esta conciliación es antigua y no guardó el detalle por líneas. Lo tienes en el informe.
        </p>
      )}
    </section>
  );
}
