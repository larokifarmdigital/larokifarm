import type { DashboardKpis } from '../data/dashboardData';

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

export function KpiCards({ kpis }: { kpis: DashboardKpis }) {
  const budgetTone: 'neutral' | 'warning' | 'accent' =
    kpis.budgetPct === null ? 'neutral' : kpis.budgetPct >= 90 ? 'warning' : 'accent';
  const budgetHint =
    kpis.monthlyBudgetUsd === null
      ? 'Sin presupuesto configurado'
      : `de ${formatUsd(kpis.monthlyBudgetUsd)} · ${kpis.budgetPct}%`;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard eyebrow="Total histórico" value={String(kpis.total)} hint="Conciliaciones ejecutadas" />
      <KpiCard eyebrow="Este mes" value={String(kpis.thisMonth)} hint="Nuevas conciliaciones" />
      <KpiCard
        eyebrow="Reports abiertos"
        value={String(kpis.reportsOpen)}
        tone={kpis.reportsOpen > 0 ? 'warning' : 'neutral'}
        hint={kpis.reportsOpen > 0 ? 'Pendientes de revisar' : 'Todo revisado'}
      />
      <KpiCard
        eyebrow="Coste IA · mes"
        value={formatUsd(kpis.costUsdThisMonth)}
        hint={budgetHint}
        tone={budgetTone}
      />
    </div>
  );
}
