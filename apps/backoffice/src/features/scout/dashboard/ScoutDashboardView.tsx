import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/features/shell/NavIcon';

type Props = {
  standaloneUrl: string;
  totalBatches: number;
  runningBatches: number;
  totalQueriesHistoric: number;
};

function KpiCard({
  eyebrow,
  value,
  hint,
  muted = false,
}: {
  eyebrow: string;
  value: string;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div className="card p-5">
      <p className="text-[11.5px] uppercase tracking-[0.06em] font-medium text-[var(--color-muted)] m-0">
        {eyebrow}
      </p>
      <p
        className={`mt-2 text-[28px] leading-none tracking-[-0.03em] font-medium font-mono-tabular m-0 ${
          muted ? 'text-[var(--color-muted)]' : 'text-[var(--color-ink)]'
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-2 text-[12.5px] text-[var(--color-muted)] m-0 leading-[1.4]">{hint}</p>
      )}
    </div>
  );
}

export function ScoutDashboardView({
  standaloneUrl,
  totalBatches,
  runningBatches,
  totalQueriesHistoric,
}: Props) {
  const noHistoricalData = totalBatches === 0;

  return (
    <div className="max-w-[1120px] mx-auto px-3 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16 sm:pb-24 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Comparador de precios</p>
          <h1 className="h-display m-0">Scout</h1>
          <p className="mt-2 text-[14px] text-[var(--color-muted)] m-0 max-w-[560px]">
            Comparación masiva de precios contra farmacias online. La ejecución vive en
            el scout actual — desde aquí ves el estado y saltas allí sin re-login.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="accent" size="lg">
            <a href={standaloneUrl} target="_blank" rel="noopener noreferrer">
              <NavIcon name="MagnifyingGlass" size={14} weight="bold" />
              Abrir scout
              <NavIcon name="ArrowSquareOut" size={13} />
            </a>
          </Button>
        </div>
      </header>

      {/* Banner de estado */}
      <div className="rounded-[8px] border border-[var(--color-accent-tint)] bg-[var(--color-accent-soft)] px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <NavIcon
              name="Info"
              size={18}
              weight="fill"
              className="text-[var(--color-accent)]"
            />
          </div>
          <div className="flex-1">
            <p className="text-[13.5px] font-medium text-[var(--color-ink)] m-0">
              {noHistoricalData
                ? 'Aún no hay batches persistidos en el histórico.'
                : 'Los KPIs se actualizan a medida que los batches terminan.'}
            </p>
            <p className="text-[13px] text-[var(--color-ink-2)] m-0 mt-1 leading-[1.55]">
              El scout guarda el estado en tiempo real en su Durable Object. Los
              snapshots persistentes en Neon (scout_batch_jobs) llegarán en una fase
              posterior, y a partir de ahí este panel mostrará histórico real.
              Mientras tanto, para ver el progreso de un batch en curso, abre el
              scout con el botón de arriba.
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          eyebrow="Batches persistidos"
          value={String(totalBatches)}
          hint="Histórico completo"
          muted={noHistoricalData}
        />
        <KpiCard
          eyebrow="En curso"
          value={String(runningBatches)}
          hint={runningBatches > 0 ? 'Están corriendo ahora' : 'Ninguno en marcha'}
          muted={runningBatches === 0}
        />
        <KpiCard
          eyebrow="Consultas totales"
          value={String(totalQueriesHistoric)}
          hint="Suma de queries de todos los batches"
          muted={totalQueriesHistoric === 0}
        />
      </div>
    </div>
  );
}
