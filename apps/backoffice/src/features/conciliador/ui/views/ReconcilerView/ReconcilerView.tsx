'use client';

import { Select } from '@/shared/components/atoms/Select';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { BudgetStatus } from '@/core/comparisons';
import type { Role } from '@/core/shared';
import type { PairResult, UploadKind } from '@/core/engine';
import { TarjetaLineas } from '@/features/conciliador/ui/components/HistoryResultCard';
// NOTE: import directo al componente para no arrastrar HistoryListView/ComparisonDetailView
// (server components que usan Prisma y romperían el bundle client con `node:crypto`).
import { ReportarError, ReportsList, type ReportView } from '@/features/conciliador/ui/components/ReportsSection';
import { FilePreviewModal } from '@/features/conciliador/ui/components/FilePreviewModal';
import { BTN_ACCENT, BTN_SECUNDARIO } from '../../lib/botones';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { PageHeader, ANCHO_PAGINA } from '@/shared/components/molecules/PageHeader';
import { cn } from '@/shared/lib/cn';
import {
  reconcilePairs,
  ReconcileError,
  type BudgetBlockedDetail,
  type PairToSend,
} from '../../lib/reconcile';
import {
  aArchivo,
  anadirA,
  estaCompleto,
  nombrePorDefecto,
  quitarArchivo,
  repartir,
  sanitizarNombre,
  unir,
  type ArchivoCargado,
  type Envio,
} from '../../lib/envios';
import { CLASE_TONO, chipsResumen, resumirLineas } from '../../lib/lineas';
import { Dropzone } from '../../components/Dropzone';
import { descargarXlsx, descargarZip } from '../../lib/downloads';

/** Lo que tarda de media cada envío (la IA lee el PDF y se compara). */
const SEGUNDOS_POR_ENVIO = 60;

type Fase = 'editando' | 'procesando' | 'resultado';

interface ReconcilerViewProps {
  /** null = sin límite configurado o usuario sin negocio (SUPER_ADMIN pool). */
  budgetStatus: BudgetStatus | null;
  /** null = no autenticado; sin él no se puede reportar (los CTAs de reporte no se renderizan). */
  currentUser: { id: string; role: Role } | null;
}

export function ReconcilerView({ budgetStatus, currentUser }: ReconcilerViewProps) {
  const router = useRouter();
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [fase, setFase] = useState<Fase>('editando');
  const [results, setResults] = useState<PairResult[] | null>(null);
  /** Snapshot de los envíos comprobados: sobrevive aunque luego se edite. */
  const [enviosComprobados, setEnviosComprobados] = useState<Envio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const tituloResultadoRef = useRef<HTMLHeadingElement>(null);
  /** Selector del elemento al que mover el foco tras el próximo render. */
  const [focoPendiente, setFocoPendiente] = useState<string | null>(null);
  // NOTE: si el server devuelve 402, guardamos el detalle para pintar el modal de "límite alcanzado".
  const [budgetBlocked, setBudgetBlocked] = useState<BudgetBlockedDetail | null>(
    budgetStatus?.level === 'blocked'
      ? { supportEmail: budgetStatus.supportEmail, spentUsd: budgetStatus.spentUsd, budgetUsd: budgetStatus.budgetUsd }
      : null,
  );
  const isBudgetBlocked = budgetStatus?.level === 'blocked' || !!budgetBlocked;
  const isBudgetWarning = budgetStatus?.level === 'warning';

  const listos = useMemo(() => envios.filter(estaCompleto), [envios]);
  const sinCompletar = envios.length - listos.length;
  const procesando = fase === 'procesando';

  // Mientras se comprueba, avisar si intenta cerrar o recargar la pestaña.
  useEffect(() => {
    if (!procesando) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [procesando]);

  // Tras quitar/unir/vaciar… el elemento con foco desaparece: lo movemos a uno que exista.
  useEffect(() => {
    if (!focoPendiente) return;
    const id = requestAnimationFrame(() => {
      const el =
        document.querySelector<HTMLElement>(focoPendiente) ??
        document.querySelector<HTMLElement>('[data-foco="anadir"]') ??
        document.querySelector<HTMLElement>('[data-foco="elegir"]');
      el?.focus();
      setFocoPendiente(null);
    });
    return () => cancelAnimationFrame(id);
  }, [focoPendiente, envios, fase]);

  // Al terminar: arriba del todo y foco en el título del resultado.
  useEffect(() => {
    if (fase !== 'resultado') return;
    window.scrollTo({ top: 0 });
    tituloResultadoRef.current?.focus();
  }, [fase]);

  function aceptar(files: File[]): ArchivoCargado[] {
    const ok: ArchivoCargado[] = [];
    for (const f of files) {
      const a = aArchivo(f);
      if (a) ok.push(a);
      else toast.error(`«${f.name}» no se puede usar`, { description: 'Sube el PDF del proveedor o el Excel de tu pedido.' });
    }
    return ok;
  }

  function anadir(files: File[]) {
    const nuevos = aceptar(files);
    if (nuevos.length === 0) return;
    setError(null);
    setEnvios((prev) => repartir(prev, nuevos));
  }

  function anadirAEnvio(envioId: string, files: File[]) {
    const nuevos = aceptar(files);
    if (nuevos.length) setEnvios((prev) => anadirA(prev, envioId, nuevos));
  }

  /** Cambio local con "Deshacer" (no cuesta crédito: no hace falta confirmar). */
  function conDeshacer(mensaje: string, siguiente: Envio[], foco: string) {
    const anterior = envios;
    setEnvios(siguiente);
    setFocoPendiente(foco);
    toast(mensaje, { duration: 10_000, action: { label: 'Deshacer', onClick: () => setEnvios(anterior) } });
  }

  /** Tras quitar algo: el título del mismo envío si sigue, si no el siguiente. */
  function focoTrasQuitar(envioId: string, siguiente: Envio[]): string {
    if (siguiente.some((e) => e.id === envioId)) return `#envio-${envioId}`;
    const idx = envios.findIndex((e) => e.id === envioId);
    const vecino = siguiente[Math.min(idx, siguiente.length - 1)];
    return vecino ? `#envio-${vecino.id}` : '[data-foco="elegir"]';
  }

  function nuevaComprobacion() {
    setEnvios([]);
    setResults(null);
    setEnviosComprobados([]);
    setError(null);
    setFase('editando');
    setFocoPendiente('[data-foco="elegir"]');
  }

  async function comprobar() {
    if (listos.length === 0) return;
    if (isBudgetBlocked) {
      // NOTE: si ya sabemos server-side que está bloqueado, ni llamamos a la API.
      if (!budgetBlocked && budgetStatus) {
        setBudgetBlocked({ supportEmail: budgetStatus.supportEmail, spentUsd: budgetStatus.spentUsd, budgetUsd: budgetStatus.budgetUsd });
      }
      return;
    }
    const snapshot = listos;
    setFase('procesando');
    setFocoPendiente('#estado-procesando');
    setError(null);
    try {
      const envio: PairToSend[] = snapshot.map((e) => ({
        label: e.label.trim() || nombrePorDefecto(e.pdfs, e.excels),
        pdfs: e.pdfs.map((a) => a.file),
        xlsxs: e.excels.map((a) => a.file),
      }));
      const { summary } = await reconcilePairs(envio);
      setResults(summary);
      setEnviosComprobados(snapshot);
      setFase('resultado');
    } catch (e) {
      setFase('editando');
      if (e instanceof ReconcileError && e.status === 401) {
        toast.error('Tu sesión ha caducado', { description: 'Vuelve a entrar; tus archivos no se han enviado.' });
        router.push('/login?callbackUrl=/albaranes');
        return;
      }
      if (e instanceof ReconcileError && e.status === 402 && e.budgetBlocked) {
        setBudgetBlocked(e.budgetBlocked);
        return;
      }
      setError(e instanceof Error ? e.message : 'No se pudo hacer la comprobación');
    }
  }

  const informes = (results ?? []).filter((r) => r.reportBase64);
  const esAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <div className={cn(ANCHO_PAGINA, 'pt-6', fase === 'editando' && envios.length > 0 ? 'pb-0' : 'pb-10')}>
      {fase !== 'resultado' && (
        <PageHeader
          titulo="Nueva conciliación"
          descripcion="Sube lo que te ha enviado el proveedor y tu pedido. Comprobamos unidades, precios y descuentos línea a línea."
        />
      )}

      {isBudgetWarning && budgetStatus && fase === 'editando' && <BudgetWarningBanner status={budgetStatus} />}

      {/* ---------- EDITANDO / PROCESANDO ---------- */}
      {fase !== 'resultado' && (
        <>
          {procesando && <PanelProcesando total={listos.length} />}

          {envios.length === 0 ? (
            <Dropzone onArchivos={anadir} />
          ) : (
            <section aria-label="Envíos a comprobar" className="space-y-3">
              {envios.map((e) => (
                <EnvioCard
                  key={e.id}
                  envio={e}
                  otros={envios.filter((o) => o.id !== e.id)}
                  bloqueado={procesando}
                  onRename={(label) => setEnvios((prev) => prev.map((x) => (x.id === e.id ? { ...x, label } : x)))}
                  onQuitarArchivo={(a) => {
                    const sig = quitarArchivo(envios, e.id, a.id);
                    conDeshacer(`Quitado «${a.name}»`, sig, focoTrasQuitar(e.id, sig));
                  }}
                  onEliminar={() => {
                    const sig = envios.filter((x) => x.id !== e.id);
                    conDeshacer(`Envío «${e.label}» eliminado`, sig, focoTrasQuitar(e.id, sig));
                  }}
                  onUnir={(origenId) => {
                    setEnvios((prev) => unir(prev, e.id, origenId));
                    setFocoPendiente(`#envio-${e.id}`);
                  }}
                  onAnadir={(files) => anadirAEnvio(e.id, files)}
                  onConfirmarJuntado={() =>
                    setEnvios((prev) => prev.map((x) => (x.id === e.id ? { ...x, juntadoPorNosotros: false } : x)))
                  }
                />
              ))}
              {!procesando && <Dropzone onArchivos={anadir} compacto />}
            </section>
          )}

          {error && (
            <p role="alert" className="mt-5 rounded-[10px] border border-[var(--color-red-ink)]/20 bg-[var(--color-red-soft)] px-4 py-3 text-[14px] text-[var(--color-red-ink)]">
              {error}
            </p>
          )}

          {envios.length > 0 && !procesando && (
            <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 mt-6 border-t border-[var(--color-hairline)] bg-[var(--color-surface)]/95 backdrop-blur">
              <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-0 text-[14px]">
                  <span className="font-medium text-[var(--color-ink)]">
                    {listos.length} {listos.length === 1 ? 'envío listo' : 'envíos listos'}
                  </span>
                  {sinCompletar > 0 && (
                    <span className="block text-[var(--color-yellow-ink)]">
                      {sinCompletar} sin completar: no se comprobará{sinCompletar === 1 ? '' : 'n'}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => conDeshacer('Se han quitado todos los archivos', [], '[data-foco="elegir"]')}
                    className={cn(BTN_SECUNDARIO, 'flex-1 sm:flex-none')}
                  >
                    Vaciar
                  </button>
                  <button
                    type="button"
                    onClick={comprobar}
                    disabled={listos.length === 0 || isBudgetBlocked}
                    title={isBudgetBlocked ? 'Se alcanzó el límite de uso mensual.' : undefined}
                    className={cn(BTN_ACCENT, 'flex-[2] sm:flex-none')}
                  >
                    {isBudgetBlocked
                      ? 'Límite mensual alcanzado'
                      : `Comprobar ${listos.length} ${listos.length === 1 ? 'envío' : 'envíos'}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------- RESULTADO ---------- */}
      {fase === 'resultado' && results && (
        <section aria-labelledby="titulo-resultado" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1
                id="titulo-resultado"
                ref={tituloResultadoRef}
                tabIndex={-1}
                className="m-0 text-[26px] sm:text-[28px] font-bold tracking-[-0.03em] text-[var(--color-ink)] outline-none"
              >
                Comprobación terminada
              </h1>
              <p className="m-0 mt-1 text-[15px] text-[var(--color-muted)]">
                {results.length} {results.length === 1 ? 'envío comprobado' : 'envíos comprobados'} ·{' '}
                <Link href="/albaranes/historial" className="font-medium text-[var(--color-accent)] underline underline-offset-2">
                  Guardado en el historial
                </Link>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {informes.length > 1 && (
                <button
                  type="button"
                  className={BTN_SECUNDARIO}
                  onClick={() =>
                    descargarZip(
                      informes.map((r) => ({ nombre: `${sanitizarNombre(r.label) || 'informe'}.xlsx`, base64: r.reportBase64! })),
                    )
                  }
                >
                  <NavIcon name="DownloadSimple" size={16} />
                  Descargar todos (ZIP)
                </button>
              )}
              <button type="button" onClick={nuevaComprobacion} className={BTN_SECUNDARIO}>
                <NavIcon name="Plus" size={16} />
                Nueva comprobación
              </button>
            </div>
          </div>

          <ul className="space-y-8">
            {results.map((r) => (
              <ResultCard
                key={r.id}
                r={r}
                envio={enviosComprobados[r.id]}
                currentUser={currentUser}
                verDepuracion={esAdmin}
              />
            ))}
          </ul>
        </section>
      )}

      {budgetBlocked && <BudgetBlockedModal detail={budgetBlocked} onClose={() => setBudgetBlocked(null)} />}

      {/* Región viva SIEMPRE montada: los lectores de pantalla no anuncian
          regiones que aparecen ya con texto. */}
      <div role="status" aria-live="polite" className="sr-only">
        {procesando
          ? `Comprobando ${listos.length} ${listos.length === 1 ? 'envío' : 'envíos'}. Suele tardar un minuto por envío.`
          : fase === 'resultado'
            ? 'Comprobación terminada.'
            : ''}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Procesando                                                          */
/* ------------------------------------------------------------------ */

function PanelProcesando({ total }: { total: number }) {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const estimado = total * SEGUNDOS_POR_ENVIO;
  // Progreso aproximado: nunca llega al 100 % por su cuenta
  const pct = Math.min(95, Math.round((segundos / estimado) * 100));
  const restanteMin = Math.max(1, Math.ceil((estimado - segundos) / 60));

  return (
    <div className="card p-5 sm:p-6 mb-4 border-[var(--color-accent)]/30">
      <div className="flex items-center gap-3">
        <span className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[var(--color-accent-soft)] border-t-[var(--color-accent)]" aria-hidden />
        <h2 id="estado-procesando" tabIndex={-1} className="m-0 text-[16px] font-semibold text-[var(--color-ink)] outline-none">
          Comprobando {total} {total === 1 ? 'envío' : 'envíos'}…
        </h2>
      </div>
      <div className="mt-4 h-2 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden" aria-hidden>
        <div className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      <p className="m-0 mt-3 text-[14px] text-[var(--color-muted)]">
        {segundos < estimado ? `Unos ${restanteMin} min más (aproximado). ` : 'Casi está… '}
        <strong className="font-semibold text-[var(--color-ink)]">No cierres esta pestaña.</strong>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta de un envío (antes de comprobar)                            */
/* ------------------------------------------------------------------ */

function ChipArchivo({ archivo, onQuitar, bloqueado }: { archivo: ArchivoCargado; onQuitar: () => void; bloqueado: boolean }) {
  return (
    <li className="flex items-center gap-2 min-h-11 pl-3 pr-1 rounded-[8px] bg-[var(--color-surface-2)]">
      <NavIcon
        name={archivo.kind === 'pdf' ? 'FilePdf' : 'FileXls'}
        size={18}
        className={archivo.kind === 'pdf' ? 'text-[var(--color-red-ink)]' : 'text-[var(--color-green-ink)]'}
      />
      <span className="flex-1 min-w-0 truncate text-[14px] text-[var(--color-ink)]">{archivo.name}</span>
      <button
        type="button"
        onClick={onQuitar}
        disabled={bloqueado}
        aria-label={`Quitar ${archivo.name}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)] disabled:opacity-40"
      >
        <NavIcon name="X" size={16} />
      </button>
    </li>
  );
}

function HuecoVacio({ kind, onAnadir, bloqueado }: { kind: UploadKind; onAnadir: (files: File[]) => void; bloqueado: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-2 min-h-11 px-3 py-1.5 rounded-[8px] border border-dashed border-[var(--color-hairline-strong)]">
      <span className="flex-1 min-w-0 text-[14px] text-[var(--color-muted)]">
        {kind === 'pdf' ? 'Falta el albarán o factura (PDF)' : 'Falta tu pedido (Excel)'}
      </span>
      <button
        type="button"
        disabled={bloqueado}
        onClick={() => ref.current?.click()}
        className="min-h-11 px-3 rounded-[8px] text-[14px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] disabled:opacity-40"
      >
        Añadir
      </button>
      <input
        ref={ref}
        type="file"
        multiple
        accept={kind === 'pdf' ? '.pdf' : '.xlsx,.xls,.xlsm'}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.target.files?.length) onAnadir(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
    </div>
  );
}

function EnvioCard({
  envio,
  otros,
  bloqueado,
  onRename,
  onQuitarArchivo,
  onEliminar,
  onUnir,
  onAnadir,
  onConfirmarJuntado,
}: {
  envio: Envio;
  otros: Envio[];
  bloqueado: boolean;
  onRename: (label: string) => void;
  onQuitarArchivo: (a: ArchivoCargado) => void;
  onEliminar: () => void;
  onUnir: (origenId: string) => void;
  onAnadir: (files: File[]) => void;
  onConfirmarJuntado: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const lapizRef = useRef<HTMLButtonElement>(null);
  const yaEdito = useRef(false);
  // Al salir de la edición (Enter/Escape/blur) el foco vuelve al lápiz
  useEffect(() => {
    if (editando) yaEdito.current = true;
    else if (yaEdito.current) lapizRef.current?.focus();
  }, [editando]);
  const completo = estaCompleto(envio);
  // Para el selector "¿Qué pedido es?": envíos que solo tienen Excel (y al revés)
  const candidatos = otros.filter((o) =>
    envio.excels.length === 0 ? o.pdfs.length === 0 && o.excels.length > 0 : o.excels.length === 0 && o.pdfs.length > 0,
  );

  return (
    <article
      aria-label={`Envío ${envio.label}`}
      className={cn('card p-4 sm:p-5', !completo && 'border-[var(--color-yellow-ink)]/30', envio.juntadoPorNosotros && 'border-[var(--color-yellow-ink)]/40')}
    >
      <div className="flex items-center gap-2">
        {editando ? (
          <input
            autoFocus
            defaultValue={envio.label}
            aria-label="Nombre del envío"
            onBlur={(e) => {
              onRename(e.target.value.trim() || nombrePorDefecto(envio.pdfs, envio.excels));
              setEditando(false);
            }}
            onKeyDown={(e) => {
              // preventDefault: si no, el keypress de este Enter activa el lápiz (que ya tiene el foco) y reabre la edición
              if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
              if (e.key === 'Escape') setEditando(false);
            }}
            className="field flex-1 min-w-0 text-[15px] font-semibold"
          />
        ) : (
          <h2
            id={`envio-${envio.id}`}
            tabIndex={-1}
            className="flex-1 min-w-0 m-0 truncate text-[16px] font-bold tracking-[-0.01em] text-[var(--color-ink)] outline-none focus-visible:underline"
          >
            {envio.label}
          </h2>
        )}
        {!editando && (
          <button
            ref={lapizRef}
            type="button"
            disabled={bloqueado}
            onClick={() => setEditando(true)}
            aria-label={`Cambiar el nombre de ${envio.label}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] disabled:opacity-40"
          >
            <NavIcon name="PencilSimple" size={17} />
          </button>
        )}
        <button
          type="button"
          disabled={bloqueado}
          onClick={onEliminar}
          aria-label={`Eliminar el envío ${envio.label}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-[var(--color-muted)] hover:bg-[var(--color-red-soft)] hover:text-[var(--color-red-ink)] disabled:opacity-40"
        >
          <NavIcon name="Trash" size={17} />
        </button>
      </div>

      {envio.juntadoPorNosotros && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[8px] bg-[var(--color-yellow-soft)] px-3 py-2 text-[13.5px] text-[var(--color-yellow-ink)]">
          <NavIcon name="Warning" size={16} />
          <span className="flex-1 min-w-0">Los hemos juntado nosotros: comprueba que los PDFs son del mismo envío.</span>
          <button type="button" onClick={onConfirmarJuntado} className="min-h-11 px-2.5 rounded-[6px] font-semibold underline underline-offset-2">
            Sí, son del mismo
          </button>
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <h3 className="m-0 mb-1.5 text-[13px] font-semibold text-[var(--color-muted)]">Del proveedor</h3>
          {envio.pdfs.length > 0 ? (
            <ul className="space-y-1.5">
              {envio.pdfs.map((a) => (
                <ChipArchivo key={a.id} archivo={a} bloqueado={bloqueado} onQuitar={() => onQuitarArchivo(a)} />
              ))}
            </ul>
          ) : (
            <HuecoVacio kind="pdf" bloqueado={bloqueado} onAnadir={onAnadir} />
          )}
        </div>
        <div>
          <h3 className="m-0 mb-1.5 text-[13px] font-semibold text-[var(--color-muted)]">Tu pedido</h3>
          {envio.excels.length > 0 ? (
            <ul className="space-y-1.5">
              {envio.excels.map((a) => (
                <ChipArchivo key={a.id} archivo={a} bloqueado={bloqueado} onQuitar={() => onQuitarArchivo(a)} />
              ))}
            </ul>
          ) : (
            <HuecoVacio kind="excel" bloqueado={bloqueado} onAnadir={onAnadir} />
          )}
        </div>
      </div>

      {!completo && candidatos.length > 0 && (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 text-[14px] text-[var(--color-ink-2)]">
          <label htmlFor={`unir-${envio.id}`} className="font-medium">
            {envio.excels.length === 0 ? '¿Qué pedido es?' : '¿De qué proveedor es?'}
          </label>
          <Select
            id={`unir-${envio.id}`}
            disabled={bloqueado}
            value=""
            onValueChange={(v) => v && onUnir(v)}
            placeholder="Elige un archivo…"
            className="sm:max-w-sm min-h-11"
            options={candidatos.map((c) => ({ value: c.id, label: [...c.pdfs, ...c.excels].map((a) => a.name).join(' + ') }))}
          />
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Resultado de un envío                                               */
/* ------------------------------------------------------------------ */

function ResultCard({
  r,
  envio,
  currentUser,
  verDepuracion,
}: {
  r: PairResult;
  envio?: Envio;
  currentUser: { id: string; role: Role } | null;
  verDepuracion: boolean;
}) {
  const [verArchivos, setVerArchivos] = useState(false);
  const [reportes, setReportes] = useState<ReportView[]>([]);
  const verArchivosRef = useRef<HTMLButtonElement>(null);
  const lineas = r.detail?.lines ?? [];
  const resumen = resumirLineas(lineas);
  const chips = chipsResumen(resumen);
  const ok = r.status === 'OK';
  const errorProceso = r.status === 'ERROR';

  const archivos = envio
    ? [
        ...envio.pdfs.map((p) => ({ name: p.name, src: p.file, kind: 'pdf' as const })),
        ...envio.excels.map((e) => ({ name: e.name, src: e.file, kind: 'excel' as const })),
      ]
    : [];

  // Mismo criterio que Inicio e Historial: el proveedor es el título; el envío, secundario.
  const titulo = r.supplier || r.label || 'Proveedor sin identificar';
  const secundario = r.label && r.label !== titulo ? r.label : null;

  return (
    <li className="flex flex-col gap-4">
      {/* 1. Cabecera del envío */}
      <article className="card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="m-0 break-words text-[17px] font-bold tracking-[-0.01em] text-[var(--color-ink)]">{titulo}</h2>
            {secundario && <p className="m-0 mt-0.5 break-words text-[13px] text-[var(--color-muted)]">{secundario}</p>}
            <p
              className={cn(
                'm-0 mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-semibold',
                errorProceso ? CLASE_TONO.falta : ok ? CLASE_TONO.ok : CLASE_TONO.diferencia,
              )}
            >
              <NavIcon name={errorProceso ? 'Warning' : ok ? 'Check' : 'Warning'} size={15} />
              {errorProceso
                ? 'No se pudo comprobar'
                : ok
                  ? 'Todo coincide'
                  : `${resumen.porRevisar} ${resumen.porRevisar === 1 ? 'cosa por revisar' : 'cosas por revisar'}`}
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
          <div className="flex flex-col sm:flex-row gap-2 sm:shrink-0">
            {r.reportBase64 && (
              <button
                type="button"
                onClick={() => descargarXlsx(`${sanitizarNombre(r.label) || 'informe'}.xlsx`, r.reportBase64!)}
                className={BTN_ACCENT}
              >
                <NavIcon name="DownloadSimple" size={17} />
                Descargar informe
              </button>
            )}
            {archivos.length > 0 && (
              <button aria-haspopup="dialog" ref={verArchivosRef} type="button" onClick={() => setVerArchivos(true)} className={BTN_SECUNDARIO}>
                Ver archivos ({archivos.length})
              </button>
            )}
            {/* Lo verá y resolverá el administrador; la respuesta sale en el historial */}
            {r.comparisonId && currentUser && (
              <ReportarError comparisonId={r.comparisonId} onCreado={(nuevo) => setReportes((prev) => [nuevo, ...prev])} />
            )}
          </div>
        </div>

        {r.error && (
          <p role="alert" className="m-0 mt-3 rounded-[8px] bg-[var(--color-red-soft)] px-3 py-2.5 text-[14px] text-[var(--color-red-ink)]">
            {r.error}
          </p>
        )}
      </article>

      {/* 2. Las líneas, en su propia tarjeta (igual que en el historial) */}
      {r.detail && <TarjetaLineas lineas={r.detail.lines} nivel={3} />}
      {verDepuracion && r.detail?.rawLines && r.detail.rawLines.length > 0 && (
        <div className="card overflow-hidden p-0">
          <ExtractionDebug lines={r.detail.rawLines} />
        </div>
      )}

      {/* 3. Reportes de error (solo si hay) */}
      <ReportsList
        reports={reportes}
        isSuperAdmin={currentUser?.role === 'SUPER_ADMIN'}
        enTarjeta
        onResuelto={(res) => setReportes((prev) => prev.map((x) => (x.id === res.id ? res : x)))}
      />

      {verArchivos && archivos.length > 0 && (
        <FilePreviewModal files={archivos} onClose={() => setVerArchivos(false)} devolverFocoA={verArchivosRef} />
      )}
    </li>
  );
}

function BudgetWarningBanner({ status }: { status: BudgetStatus }) {
  const percent = Math.round(status.percent * 100);
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <span aria-hidden className="mt-0.5 shrink-0 text-amber-600">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m10.29 3.86-8.4 14.5A2 2 0 0 0 3.62 21h16.76a2 2 0 0 0 1.73-2.64l-8.4-14.5a2 2 0 0 0-3.46 0Z" />
          <line x1="12" x2="12" y1="9" y2="13" />
          <line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          Estás cerca del límite de uso mensual ({percent}%).
        </p>
        <p className="mt-0.5 text-xs text-amber-800">
          Gastado ${status.spentUsd.toFixed(2)} de $
          {status.budgetUsd?.toFixed(2) ?? '—'}. Al llegar al 100% la
          conciliación se pausará hasta el siguiente mes.
        </p>
      </div>
    </div>
  );
}

function BudgetBlockedModal({
  detail,
  onClose,
}: {
  detail: BudgetBlockedDetail;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="px-6 pt-6">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-slate-900">
                Se alcanzó el límite de uso permitido
              </h3>
              <p className="mt-1.5 text-sm text-slate-600">
                Este mes tu negocio ha consumido{' '}
                <strong className="tabular-nums text-slate-900">
                  ${detail.spentUsd.toFixed(2)}
                </strong>
                {detail.budgetUsd !== null && (
                  <>
                    {' '}
                    de{' '}
                    <strong className="tabular-nums text-slate-900">
                      ${detail.budgetUsd.toFixed(2)}
                    </strong>{' '}
                    disponibles
                  </>
                )}
                . Comunícate con el administrador para ampliar el límite o
                espera al próximo mes.
              </p>
              {detail.supportEmail && (
                <p className="mt-3 text-sm">
                  <span className="text-slate-500">Contacto:</span>{' '}
                  <a
                    href={`mailto:${detail.supportEmail}`}
                    className="font-medium underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    {detail.supportEmail}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

function ExtractionDebug({ lines }: { lines: NonNullable<PairResult['detail']>['rawLines'] }) {
  if (!lines) return null;
  return (
    <details className="bg-slate-50 px-4 py-2 text-xs">
      <summary className="cursor-pointer font-semibold text-slate-500">
        🔎 Ver lo que leyó Gemini del PDF ({lines.length} líneas) — debug
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="px-2 py-1">C.N.</th>
              <th className="px-2 py-1">EAN</th>
              <th className="px-2 py-1">Descripción</th>
              <th className="px-2 py-1 text-right">UDS</th>
              <th className="px-2 py-1 text-right">PVL</th>
              <th className="px-2 py-1 text-right">DTO</th>
              <th className="px-2 py-1 text-right">BONIF</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {lines.map((l, i) => (
              <tr key={i} className="border-t border-slate-200">
                <td className="px-2 py-1">{l.nationalCode || l.code || '—'}</td>
                <td className="px-2 py-1">{l.ean || '—'}</td>
                <td className="px-2 py-1 font-sans">{l.description}</td>
                <td className="px-2 py-1 text-right">{l.quantity}</td>
                <td className="px-2 py-1 text-right">{l.unitPrice}</td>
                <td className="px-2 py-1 text-right">{l.discount ?? 0}</td>
                <td className="px-2 py-1 text-right">{l.freeUnits ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
