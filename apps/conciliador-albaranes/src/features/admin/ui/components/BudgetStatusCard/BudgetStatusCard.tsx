import type { BudgetStatus } from '@/core/comparisons';
import { formatUsd } from '@/shared/lib/format';

interface BudgetStatusCardProps {
  status: BudgetStatus;
}

export function BudgetStatusCard({ status }: BudgetStatusCardProps) {
  if (status.level === 'unlimited' || status.budgetUsd === null) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Límite mensual
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900">Sin límite</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
            libre
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Este negocio no tiene tope de gasto configurado. Contacta con el
          administrador si necesitas establecerlo.
        </p>
      </div>
    );
  }

  const percent = Math.min(100, Math.round(status.percent * 100));
  const isBlocked = status.level === 'blocked';
  const isWarn = status.level === 'warning';
  const barColor = isBlocked ? '#dc2626' : isWarn ? '#f59e0b' : 'var(--brand-primary)';
  const badgeStyles = isBlocked
    ? { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', label: 'bloqueado' }
    : isWarn
      ? { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', label: 'aviso' }
      : { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', label: 'ok' };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Límite mensual
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
            {formatUsd(status.spentUsd)}{' '}
            <span className="text-sm font-normal text-slate-400">
              / {formatUsd(status.budgetUsd)}
            </span>
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset ${badgeStyles.bg} ${badgeStyles.text} ${badgeStyles.ring}`}
        >
          {badgeStyles.label} · {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percent}%`, background: barColor }}
        />
      </div>
      {status.supportEmail && (
        <p className="mt-2 text-[11px] text-slate-400">
          Contacto:{' '}
          <a
            href={`mailto:${status.supportEmail}`}
            className="underline decoration-slate-300 underline-offset-2 hover:text-slate-600"
          >
            {status.supportEmail}
          </a>
        </p>
      )}
    </div>
  );
}
