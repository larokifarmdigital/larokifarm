import { NavIcon } from '@/features/shell/NavIcon';
import type { UsoData, UsoPerBusiness } from '../data/usoData';

function formatUsd(n: number): string {
  if (n === 0) return '$0.00';
  if (n < 0.01) return '<$0.01';
  return `$${n.toFixed(2)}`;
}

function KpiCard({
  eyebrow,
  value,
  hint,
  tone = 'neutral',
}: {
  eyebrow: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'warning' | 'accent';
}) {
  const valueColor =
    tone === 'warning'
      ? 'text-[var(--color-red-ink)]'
      : tone === 'accent'
        ? 'text-[var(--color-accent)]'
        : 'text-[var(--color-ink)]';
  return (
    <div className="card p-5">
      <p className="text-[11.5px] uppercase tracking-[0.06em] font-medium text-[var(--color-muted)] m-0">
        {eyebrow}
      </p>
      <p
        className={`mt-2 text-[28px] leading-none tracking-[-0.03em] font-medium font-mono-tabular m-0 ${valueColor}`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-2 text-[12.5px] text-[var(--color-muted)] m-0 leading-[1.4]">{hint}</p>
      )}
    </div>
  );
}

function BusinessRow({ row }: { row: UsoPerBusiness }) {
  const bar =
    row.monthlyBudgetUsd && row.monthlyBudgetUsd > 0 && row.budgetPct !== null
      ? Math.min(100, row.budgetPct)
      : null;
  const barTone =
    row.budgetPct === null
      ? 'bg-[var(--color-hairline-strong)]'
      : row.budgetPct >= 90
        ? 'bg-[var(--color-red-ink)]'
        : row.budgetPct >= 70
          ? 'bg-[var(--color-accent)]'
          : 'bg-[var(--color-accent)]';

  return (
    <tr className="border-t border-[var(--color-hairline)] first:border-t-0">
      <td className="py-3 px-5">
        <div className="text-[14px] font-medium text-[var(--color-ink)]">{row.name}</div>
        <div className="text-[11.5px] text-[var(--color-muted)] font-mono-tabular mt-0.5">
          {row.slug}
        </div>
      </td>
      <td className="py-3 px-5 text-right font-mono-tabular text-[13px] text-[var(--color-ink-2)]">
        <div>{row.comparisonsMonth}</div>
        <div className="text-[11px] text-[var(--color-muted)] mt-0.5">
          {row.comparisonsHistoric} hist.
        </div>
      </td>
      <td className="py-3 px-5 text-right font-mono-tabular text-[13px] text-[var(--color-ink-2)]">
        {formatUsd(row.costUsdMonth)}
      </td>
      <td className="py-3 px-5 min-w-[160px]">
        {row.monthlyBudgetUsd === null ? (
          <span className="text-[12px] text-[var(--color-muted)]">Sin budget</span>
        ) : (
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[12px] text-[var(--color-muted)]">
                {formatUsd(row.monthlyBudgetUsd)}
              </span>
              <span
                className={`text-[12px] font-mono-tabular ${
                  row.budgetPct !== null && row.budgetPct >= 90
                    ? 'text-[var(--color-red-ink)] font-medium'
                    : 'text-[var(--color-ink-2)]'
                }`}
              >
                {row.budgetPct}%
              </span>
            </div>
            {bar !== null && (
              <div className="h-1 w-full rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
                <div
                  className={`h-full ${barTone} transition-[width]`}
                  style={{ width: `${bar}%` }}
                />
              </div>
            )}
          </div>
        )}
      </td>
      <td className="py-3 px-5 text-right font-mono-tabular text-[13px]">
        {row.reportsOpen > 0 ? (
          <span className="text-[var(--color-red-ink)] font-medium">{row.reportsOpen}</span>
        ) : (
          <span className="text-[var(--color-muted)]">0</span>
        )}
      </td>
    </tr>
  );
}

export function UsoView({ data }: { data: UsoData }) {
  const monthName = new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="max-w-[1120px] mx-auto px-3 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-16 sm:pb-24 space-y-8">
      {/* Header */}
      <header>
        <p className="eyebrow mb-2">Sistema</p>
        <h1 className="h-display m-0">Uso</h1>
        <p className="mt-2 text-[14px] text-[var(--color-muted)] m-0">
          Consumo de IA y actividad de todas las farmacias. Datos del mes en curso
          ({monthName}).
        </p>
      </header>

      {/* Banner explicativo */}
      <div className="rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-surface-2)] px-5 py-4">
        <div className="flex items-start gap-3">
          <NavIcon
            name="Info"
            size={16}
            weight="fill"
            className="text-[var(--color-muted)] shrink-0 mt-0.5"
          />
          <p className="text-[13px] text-[var(--color-ink-2)] m-0 leading-[1.55]">
            Hoy sólo se contabiliza el conciliador (columnas <code className="font-mono-tabular">
            comparisons.geminiCostUsd</code>). Scout y chatbot aparecerán aquí en cuanto
            el worker persista <code className="font-mono-tabular">usage_entries</code>.
          </p>
        </div>
      </div>

      {/* KPIs globales */}
      <section>
        <h2 className="text-[14px] leading-tight tracking-[-0.02em] font-medium text-[var(--color-ink)] m-0 mb-3">
          Este mes · global
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            eyebrow="Coste IA"
            value={formatUsd(data.kpis.totalCostUsdMonth)}
            hint="Gemini · conciliador"
            tone="accent"
          />
          <KpiCard
            eyebrow="Comparaciones"
            value={String(data.kpis.totalComparisonsMonth)}
            hint="Ejecutadas este mes"
          />
          <KpiCard
            eyebrow="Con discrepancias"
            value={String(data.kpis.totalDiscrepanciesMonth)}
            hint="Necesitaron revisión"
          />
          <KpiCard
            eyebrow="Reports abiertos"
            value={String(data.kpis.totalReportsOpen)}
            hint={
              data.kpis.totalReportsOpen > 0
                ? 'Pendientes de resolver'
                : 'Todo resuelto'
            }
            tone={data.kpis.totalReportsOpen > 0 ? 'warning' : 'neutral'}
          />
        </div>
      </section>

      {/* Por farmacia */}
      <section>
        <h2 className="text-[14px] leading-tight tracking-[-0.02em] font-medium text-[var(--color-ink)] m-0 mb-3">
          Por farmacia
        </h2>
        {data.perBusiness.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-[14px] text-[var(--color-muted)] m-0">Sin farmacias.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-[13.5px]">
              <thead>
                <tr className="border-b border-[var(--color-hairline)]">
                  <th className="text-left font-medium text-[var(--color-muted)] py-3 px-5 text-[12px] uppercase tracking-[0.05em]">
                    Farmacia
                  </th>
                  <th className="text-right font-medium text-[var(--color-muted)] py-3 px-5 text-[12px] uppercase tracking-[0.05em]">
                    Comparaciones
                  </th>
                  <th className="text-right font-medium text-[var(--color-muted)] py-3 px-5 text-[12px] uppercase tracking-[0.05em]">
                    Coste mes
                  </th>
                  <th className="text-left font-medium text-[var(--color-muted)] py-3 px-5 text-[12px] uppercase tracking-[0.05em]">
                    Budget
                  </th>
                  <th className="text-right font-medium text-[var(--color-muted)] py-3 px-5 text-[12px] uppercase tracking-[0.05em]">
                    Reports
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.perBusiness.map((b) => (
                  <BusinessRow key={b.id} row={b} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
