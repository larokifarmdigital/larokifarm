'use client';

/* eslint-disable react-hooks/set-state-in-effect */
// Este componente hace data-fetching en useEffect (patrón estándar). El lint prefiere
// useTransition o Suspense con use(), pero para un fetch cross-server-boundary con
// cleanup el patrón clásico es el más legible y el que espera un dev nuevo del proyecto.

import { useEffect, useState } from 'react';
import type { MedicamentoInfo } from '@/core/domain/models/MedicamentoInfo';
import { fetchCimaInfoAction } from '@/ui/actions/cimaInfoAction';

export interface MedicamentoInfoCardProps {
  /** Código Nacional del medicamento. Si no viene, no se hace fetch. */
  cn?: string;
}

/**
 * Card informativa que aparece cuando el user busca por CN de medicamento regulado.
 * Fetchea la info completa a CIMA (server action) y muestra:
 * - Principios activos + dosis
 * - Laboratorio titular
 * - Vía de administración
 * - Badge de "Con receta" / "Genérico EFG"
 * - Links a prospecto y ficha técnica oficiales (PDF)
 */
export function MedicamentoInfoCard({ cn }: MedicamentoInfoCardProps) {
  const [info, setInfo] = useState<MedicamentoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cn) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setInfo(null);
    fetchCimaInfoAction(cn)
      .then((res) => {
        if (!alive) return;
        if (res.ok) setInfo(res.info);
        else setError(res.error);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [cn]);

  if (!cn) return null;
  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-teal-200/60 bg-teal-50/40 p-4 dark:border-teal-900/30 dark:bg-teal-950/10">
        <div className="h-3 w-32 rounded bg-teal-200/60 dark:bg-teal-900/40" />
        <div className="mt-2 h-4 w-2/3 rounded bg-teal-200/60 dark:bg-teal-900/40" />
      </div>
    );
  }
  if (error || !info) return null;

  return (
    <section
      className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/70 to-white p-5 dark:border-teal-900/60 dark:from-teal-950/20 dark:to-zinc-950"
      aria-label="Información del medicamento"
    >
      <header className="mb-3 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 0-7.07l0 0a5 5 0 0 1 7.07 0L20.5 16.5a3 3 0 0 1 0 4.24l0 0a3 3 0 0 1-4.24 0z" />
            <path d="m8.5 8.5 7 7" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
            Información del medicamento · Fuente CIMA/AEMPS
          </div>
          <h3 className="mt-0.5 text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
            {info.nombre}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {info.necesitaReceta === true && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60">
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a1 1 0 0 1-1 1H4M20 3v3a1 1 0 0 0 1 1h-1M4 21h16" /><rect x="5" y="8" width="14" height="10" rx="1" /></svg>
                Con receta
              </span>
            )}
            {info.necesitaReceta === false && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
                Sin receta (OTC)
              </span>
            )}
            {info.esGenerico && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900/60">
                Genérico EFG
              </span>
            )}
            {info.nregistro && (
              <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                NR {info.nregistro}
              </span>
            )}
          </div>
        </div>
      </header>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        {info.principiosActivos && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
              Principio(s) activo(s)
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-800 dark:text-zinc-200">
              {info.principiosActivos}
            </dd>
          </div>
        )}
        {info.laboratorio && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
              Laboratorio titular
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-800 dark:text-zinc-200">{info.laboratorio}</dd>
          </div>
        )}
        {info.viaAdministracion && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
              Vía de administración
            </dt>
            <dd className="mt-0.5 text-sm text-zinc-800 dark:text-zinc-200">
              {info.viaAdministracion}
            </dd>
          </div>
        )}
        {info.ean && (
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
              Código de barras (EAN)
            </dt>
            <dd className="mt-0.5 font-mono text-sm text-zinc-800 dark:text-zinc-200">{info.ean}</dd>
          </div>
        )}
      </dl>

      {(info.prospectoUrl || info.fichaTecnicaUrl) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-teal-100 pt-3 dark:border-teal-900/40">
          {info.prospectoUrl && (
            <a
              href={info.prospectoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-500 bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M9 13h6M9 17h4" /></svg>
              Prospecto oficial
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
            </a>
          )}
          {info.fichaTecnicaUrl && (
            <a
              href={info.fichaTecnicaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-teal-400 hover:text-teal-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-teal-600 dark:hover:text-teal-300"
            >
              Ficha técnica
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
            </a>
          )}
        </div>
      )}
    </section>
  );
}
