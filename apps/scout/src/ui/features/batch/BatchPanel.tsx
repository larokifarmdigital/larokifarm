'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button } from '@/ui/components/Button/Button';
import { AppShell } from '@/ui/components/AppShell';
import {
  downloadBatchResultAction,
  getBatchHealthAction,
  getBatchPreviewAction,
  getJobStatusAction,
  listRecentJobsAction,
  logoutBatchAction,
  runBatchAction,
  type RunActionState,
} from '@/ui/actions/batchActions';
import type {
  HealthData,
  JobState,
  PreviewData,
} from '@/core/infrastructure/batch/BatchWorkerClient';

type Phase = 'idle' | 'confirming' | 'running' | 'completed' | 'failed';

interface ViewState {
  phase: Phase;
  jobId?: string;
  status?: JobState;
  errorMsg?: string;
  downloadInFlight?: string; // jobId siendo descargado (permite descargar cualquier job del historial)
}

const POLL_INTERVAL_MS = 2000;

export function BatchPanel() {
  const [view, setView] = useState<ViewState>({ phase: 'idle' });
  const [health, setHealth] = useState<HealthData | null>(null);
  const [preview, setPreview] = useState<PreviewData | { error: string } | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobState[]>([]);

  const [runState, runFormAction, running] = useActionState<RunActionState, FormData>(
    runBatchAction,
    { status: 'idle' },
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [h, p, jobs] = await Promise.all([
        getBatchHealthAction(),
        getBatchPreviewAction(),
        listRecentJobsAction(),
      ]);
      if (cancelled) return;
      if (!('error' in h)) setHealth(h);
      setPreview(p);
      if (!('error' in jobs)) setRecentJobs(jobs);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (runState.status === 'running') {
      setView({ phase: 'running', jobId: runState.jobId });
    } else if (runState.status === 'error') {
      setView({ phase: 'failed', errorMsg: runState.error });
    }
  }, [runState]);

  // Polling cada 2s mientras el job está en curso.
  useEffect(() => {
    if (view.phase !== 'running' || !view.jobId) return;
    let cancelled = false;

    async function tick() {
      if (cancelled || !view.jobId) return;
      const res = await getJobStatusAction(view.jobId);
      if (cancelled) return;
      if ('error' in res) {
        setView({ phase: 'failed', errorMsg: res.error, jobId: view.jobId });
        return;
      }
      if (res.status === 'completed') {
        setView({ phase: 'completed', jobId: view.jobId, status: res });
        listRecentJobsAction().then((jobs) => {
          if (!('error' in jobs)) setRecentJobs(jobs);
        });
        return;
      }
      if (res.status === 'failed') {
        setView({
          phase: 'failed',
          jobId: view.jobId,
          errorMsg: res.error ?? 'El batch falló sin mensaje.',
          status: res,
        });
        return;
      }
      setView((v) => ({ ...v, status: res }));
    }

    tick();
    const id = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [view.phase, view.jobId]);

  async function handleDownload(jobId: string) {
    if (view.downloadInFlight) return;
    setView((v) => ({ ...v, downloadInFlight: jobId }));
    const res = await downloadBatchResultAction(jobId);
    setView((v) => ({ ...v, downloadInFlight: undefined }));
    if (!res.ok) {
      alert(`Error descargando: ${res.error}`);
      return;
    }
    triggerBrowserDownload(res.base64, res.filename);
  }

  const isMock = health?.mockMode === true;

  const logoutButton = (
    <form action={logoutBatchAction}>
      <button
        type="submit"
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[color:var(--border)] bg-white/[0.03] px-2.5 text-xs font-medium text-[color:var(--foreground)] backdrop-blur transition-colors duration-[var(--dur-fast)] hover:border-[color:var(--border-strong)] hover:bg-white/[0.06]"
        title="Salir del panel"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        <span className="hidden sm:inline">Salir</span>
      </button>
    </form>
  );

  return (
    <AppShell actions={logoutButton}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
        <header className="mb-10 flex flex-col gap-4" data-reveal>
          <div className="flex flex-wrap items-center gap-3">
            <span className="section-eyebrow">Comparación masiva</span>
            {isMock && <MockBadge />}
          </div>
          <h1 className="h-display h-display-gradient m-0 max-w-[20ch]">
            Todo tu catálogo, de golpe.
          </h1>
          <p className="max-w-[52ch] text-[color:var(--muted-foreground)]">
            Procesa el catálogo entero de productos leído de SharePoint y genera
            un Excel con los precios encontrados en varias farmacias online.
          </p>
        </header>

        {view.phase === 'idle' && (
          <IdleView
            preview={preview}
            recentJobs={recentJobs}
            onLaunch={() => setView({ phase: 'confirming' })}
            onDownload={handleDownload}
            downloadingId={view.downloadInFlight}
            isMock={isMock}
          />
        )}

        {view.phase === 'confirming' && (
          <ConfirmView
            preview={preview}
            isMock={isMock}
            onCancel={() => setView({ phase: 'idle' })}
            formAction={runFormAction}
            submitting={running}
          />
        )}

        {view.phase === 'running' && (
          <RunningView status={view.status} jobId={view.jobId ?? '—'} />
        )}

        {view.phase === 'completed' && (
          <CompletedView
            status={view.status}
            onDownload={() => view.jobId && handleDownload(view.jobId)}
            downloading={view.downloadInFlight === view.jobId}
            onReset={() => setView({ phase: 'idle' })}
          />
        )}

        {view.phase === 'failed' && (
          <FailedView
            errorMsg={view.errorMsg ?? 'Error desconocido'}
            onRetry={() => setView({ phase: 'idle' })}
          />
        )}
      </div>
    </AppShell>
  );
}

// -------- Subviews --------

function MockBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--pastel-amber-fg)]/30 bg-[color:var(--pastel-amber-bg)] px-3 py-1 text-[11px] font-medium tracking-wide text-[color:var(--pastel-amber-fg)]">
      <span className="motion-pulse inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--pastel-amber-fg)]" />
      MODO PRUEBA · datos ficticios
    </span>
  );
}

function IdleView({
  preview,
  recentJobs,
  onLaunch,
  onDownload,
  downloadingId,
  isMock,
}: {
  preview: PreviewData | { error: string } | null;
  recentJobs: JobState[];
  onLaunch: () => void;
  onDownload: (jobId: string) => void;
  downloadingId?: string;
  isMock: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Preview del Excel */}
      <PreviewCard preview={preview} />

      {/* CTA principal */}
      <section className="glass-strong p-6 sm:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <h2 className="text-lg font-semibold text-[color:var(--foreground-strong)]">
              Lanzar comparación completa
            </h2>
            <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
              Duración estimada ~2 horas. {isMock
                ? 'En modo prueba, tarda solo unos segundos y no gasta créditos.'
                : 'Consumo estimado: ≈ 46 € del servicio externo (solo si es el primer batch del mes).'}
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={onLaunch}>
            Ejecutar batch
          </Button>
        </div>
      </section>

      {/* Historial de batches recientes */}
      {recentJobs.length > 0 && (
        <RecentJobsSection
          jobs={recentJobs}
          onDownload={onDownload}
          downloadingId={downloadingId}
        />
      )}
    </div>
  );
}

function PreviewCard({ preview }: { preview: PreviewData | { error: string } | null }) {
  if (preview === null) {
    return (
      <section className="glass p-6">
        <div className="flex items-center gap-3">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[color:var(--border-strong)] border-t-[color:var(--foreground-strong)]" />
          <p className="text-sm text-[color:var(--muted-foreground)]">
            Leyendo el Excel de SharePoint…
          </p>
        </div>
      </section>
    );
  }

  if ('error' in preview) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[color:var(--pastel-red-fg)]/25 bg-[color:var(--pastel-red-bg)] p-6">
        <h3 className="text-sm font-semibold text-[color:var(--pastel-red-fg)]">
          No se pudo leer el Excel
        </h3>
        <p className="mt-1 text-sm text-[color:var(--pastel-red-fg)]/85">{preview.error}</p>
        <p className="mt-3 text-xs text-[color:var(--pastel-red-fg)]/75">
          Verifica que <code>SHAREPOINT_INPUT_URL</code> y <code>AZURE_CLIENT_SECRET</code> están
          configurados en el worker.
        </p>
      </section>
    );
  }

  return (
    <section className="glass p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
          Excel detectado en SharePoint
        </h3>
        <span className="text-xs text-[color:var(--muted)]">
          Cabeceras: {preview.headersDetectados.join(' · ')}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Productos a comparar" value={preview.totalConsiderados} highlight />
        <StatCard label="Total en el Excel" value={preview.totalDataRows} />
        <StatCard label="Descatalogados omitidos" value={preview.skippedMuerto} muted />
        <StatCard label="CNs inválidos" value={preview.skippedInvalidCn} muted />
      </div>

      {preview.primeros.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-medium text-[color:var(--muted)]">
            Primeros productos que se compararán:
          </p>
          <ul className="divide-y divide-[color:var(--border)] rounded-[var(--radius)] border border-[color:var(--border)] bg-white/[0.02] backdrop-blur">
            {preview.primeros.map((p) => (
              <li key={p.cn} className="flex items-center gap-3 px-3 py-2 text-xs">
                <code className="font-mono-tabular shrink-0 rounded-[var(--radius-xs)] border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[color:var(--accent-hover)]">
                  {p.cn}
                </code>
                <span className="truncate text-[color:var(--foreground)]">{p.nombre}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? 'rounded-[var(--radius)] border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] p-3 shadow-[0_0_20px_var(--accent-glow)]'
          : muted
            ? 'rounded-[var(--radius)] border border-[color:var(--border)] bg-white/[0.02] p-3 backdrop-blur'
            : 'rounded-[var(--radius)] border border-[color:var(--border)] bg-white/[0.03] p-3 backdrop-blur'
      }
    >
      <dt className="text-[11px] text-[color:var(--muted)]">{label}</dt>
      <dd
        className={
          highlight
            ? 'mt-0.5 text-xl font-bold tabular-nums text-[color:var(--accent)]'
            : 'mt-0.5 text-lg font-semibold tabular-nums text-[color:var(--foreground-strong)]'
        }
      >
        {value.toLocaleString('es-ES')}
      </dd>
    </div>
  );
}

function ConfirmView({
  preview,
  isMock,
  onCancel,
  formAction,
  submitting,
}: {
  preview: PreviewData | { error: string } | null;
  isMock: boolean;
  onCancel: () => void;
  formAction: (formData: FormData) => void;
  submitting: boolean;
}) {
  const total =
    preview && !('error' in preview) ? preview.totalConsiderados : null;

  return (
    <section className="rounded-[var(--radius-lg)] border border-[color:var(--pastel-amber-fg)]/30 bg-[color:var(--pastel-amber-bg)] p-8 backdrop-blur">
      <h2 className="text-lg font-semibold text-[color:var(--pastel-amber-fg)]">
        ¿Confirmas ejecutar el batch?
      </h2>
      <p className="mt-2 text-sm text-[color:var(--pastel-amber-fg)]/85">
        {total != null && (
          <>
            Se procesarán{' '}
            <strong className="tabular-nums">{total.toLocaleString('es-ES')}</strong> productos.
            {' '}
          </>
        )}
        {isMock
          ? 'Modo prueba activo — no se consumen créditos reales.'
          : 'Se consumirán créditos del servicio externo (~46 € si es el primer batch del mes).'}
      </p>
      <form action={formAction} className="mt-6 flex gap-3">
        <Button type="submit" variant="primary" size="md" disabled={submitting}>
          {submitting ? 'Lanzando…' : 'Sí, ejecutar'}
        </Button>
        <Button type="button" variant="secondary" size="md" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </form>
    </section>
  );
}

function RunningView({ status, jobId }: { status?: JobState; jobId: string }) {
  const processed = status?.processed ?? 0;
  const total = status?.total ?? 0;
  const pct = total > 0 ? Math.floor((processed / total) * 100) : 0;
  const elapsed = status?.startedAt ? formatElapsed(new Date(status.startedAt)) : '';

  return (
    <section className="glass p-8">
      <div className="flex items-center gap-3">
        <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[color:var(--accent)]" />
        <h2 className="text-lg font-semibold text-[color:var(--foreground-strong)]">Procesando…</h2>
      </div>
      <p className="mt-2 text-sm text-[color:var(--muted)]">
        Job <code className="font-mono text-xs">{jobId}</code>
      </p>

      <div className="mt-6">
        <div className="flex items-baseline justify-between text-sm">
          <span className="tabular-nums text-[color:var(--foreground)]">
            {processed.toLocaleString('es-ES')} / {total.toLocaleString('es-ES')} productos
          </span>
          <span className="tabular-nums font-medium text-[color:var(--foreground-strong)]">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-[color:var(--accent)] transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        {elapsed && (
          <p className="mt-3 text-xs tabular-nums text-[color:var(--muted)]">
            Tiempo transcurrido: {elapsed}
          </p>
        )}
      </div>

      <p className="mt-8 text-xs text-[color:var(--muted)]">
        Puedes cerrar esta pestaña. El resultado quedará disponible 7 días para descargar desde el
        historial.
      </p>
    </section>
  );
}

function CompletedView({
  status,
  onDownload,
  downloading,
  onReset,
}: {
  status?: JobState;
  onDownload: () => void;
  downloading: boolean;
  onReset: () => void;
}) {
  const duration =
    status?.startedAt && status?.finishedAt
      ? formatDuration(new Date(status.startedAt), new Date(status.finishedAt))
      : '';
  const total = status?.total ?? 0;

  return (
    <section className="rounded-[var(--radius-lg)] border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] p-8 backdrop-blur shadow-[0_0_40px_var(--accent-glow)]">
      <h2 className="text-lg font-semibold text-[color:var(--accent)]">
        ✓ Batch completado
      </h2>
      <p className="mt-2 text-sm text-[color:var(--foreground)]">
        {total.toLocaleString('es-ES')} productos procesados{duration && ` en ${duration}`}.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="primary" size="lg" onClick={onDownload} disabled={downloading}>
          {downloading ? 'Preparando descarga…' : 'Descargar Excel'}
        </Button>
        <Button variant="secondary" size="lg" onClick={onReset}>
          Volver
        </Button>
      </div>
    </section>
  );
}

function FailedView({ errorMsg, onRetry }: { errorMsg: string; onRetry: () => void }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[color:var(--pastel-red-fg)]/30 bg-[color:var(--pastel-red-bg)] p-8 backdrop-blur">
      <h2 className="text-lg font-semibold text-[color:var(--pastel-red-fg)]">Algo falló</h2>
      <p className="mt-2 text-sm text-[color:var(--pastel-red-fg)]/85">{errorMsg}</p>
      <div className="mt-6">
        <Button variant="primary" size="md" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </section>
  );
}

function RecentJobsSection({
  jobs,
  onDownload,
  downloadingId,
}: {
  jobs: JobState[];
  onDownload: (jobId: string) => void;
  downloadingId?: string;
}) {
  const relevantes = jobs.filter((j) => j.status === 'completed' || j.status === 'failed');
  if (relevantes.length === 0) return null;

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[color:var(--muted)]">
        Batches recientes
      </h3>
      <ul className="divide-y divide-[color:var(--border)] overflow-hidden glass">
        {relevantes.map((job) => (
          <li key={job.jobId} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <StatusDot status={job.status} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[color:var(--foreground-strong)]">
                  {formatFriendlyDate(job.startedAt)}
                </p>
                <p className="truncate text-xs text-[color:var(--muted)]">
                  {job.status === 'completed'
                    ? `${job.total.toLocaleString('es-ES')} productos`
                    : job.error || 'Falló sin mensaje'}
                </p>
              </div>
            </div>
            {job.status === 'completed' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onDownload(job.jobId)}
                disabled={downloadingId === job.jobId}
              >
                {downloadingId === job.jobId ? 'Preparando…' : 'Descargar Excel'}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusDot({ status }: { status: JobState['status'] }) {
  if (status === 'completed') {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--pastel-red-fg)]/30 bg-[color:var(--pastel-red-bg)] text-[color:var(--pastel-red-fg)]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </span>
  );
}

// -------- Utils --------

function formatElapsed(start: Date): string {
  const seconds = Math.floor((Date.now() - start.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

function formatDuration(start: Date, end: Date): string {
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return `${h}h ${remM}m`;
}

function formatFriendlyDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function triggerBrowserDownload(base64: string, filename: string): void {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes.buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
