'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

interface QuickPreset {
  id: string;
  label: string;
  build: (today: Date) => Record<string, string | undefined>;
}

const PRESETS: readonly QuickPreset[] = [
  {
    id: 'today',
    label: 'Hoy',
    build: (today) => {
      const iso = ymd(today);
      return { from: iso, to: iso };
    },
  },
  {
    id: 'last7',
    label: 'Últimos 7 días',
    build: (today) => {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: ymd(from), to: ymd(today) };
    },
  },
  {
    id: 'last30',
    label: 'Últimos 30 días',
    build: (today) => {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from: ymd(from), to: ymd(today) };
    },
  },
  {
    id: 'this-month',
    label: 'Este mes',
    build: (today) => {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: ymd(from), to: ymd(today) };
    },
  },
  {
    id: 'discrepancies',
    label: 'Con discrepancias',
    build: () => ({ status: 'DISCREPANCIES' }),
  },
  {
    id: 'errors',
    label: 'Con errores',
    build: () => ({ status: 'ERROR' }),
  },
];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function HistoryQuickFilters() {
  const router = useRouter();
  const sp = useSearchParams();

  const activeId = useMemo(() => detectActive(sp), [sp]);

  function apply(preset: QuickPreset) {
    if (activeId === preset.id) {
      router.push('/historial');
      return;
    }
    const params = new URLSearchParams();
    const built = preset.build(new Date());
    for (const [k, v] of Object.entries(built)) {
      if (v) params.set(k, v);
    }
    router.push(`/historial?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
        Rápidos:
      </span>
      {PRESETS.map((p) => {
        const active = activeId === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => apply(p)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? 'border-transparent'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
            style={
              active
                ? {
                    background: 'var(--brand-primary-soft)',
                    color: 'var(--brand-accent)',
                    borderColor: 'var(--brand-primary-ring)',
                  }
                : undefined
            }
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

function detectActive(sp: URLSearchParams): string | null {
  const from = sp.get('from');
  const to = sp.get('to');
  const status = sp.get('status');
  const supplier = sp.get('supplier');
  const business = sp.get('business');

  if (status === 'DISCREPANCIES' && !from && !to && !supplier && !business) {
    return 'discrepancies';
  }
  if (status === 'ERROR' && !from && !to && !supplier && !business) {
    return 'errors';
  }

  if (!from || !to || status || supplier || business) return null;

  const today = new Date();
  const todayIso = ymd(today);

  if (from === todayIso && to === todayIso) return 'today';

  const last7From = new Date(today);
  last7From.setDate(last7From.getDate() - 6);
  if (from === ymd(last7From) && to === todayIso) return 'last7';

  const last30From = new Date(today);
  last30From.setDate(last30From.getDate() - 29);
  if (from === ymd(last30From) && to === todayIso) return 'last30';

  const monthFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  if (from === ymd(monthFrom) && to === todayIso) return 'this-month';

  return null;
}
