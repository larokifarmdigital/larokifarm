'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MonthlyBucket } from '@/core/comparisons';
import { formatNumber, formatUsd } from '@/shared/lib/format';

interface MonthlyChartProps {
  buckets: MonthlyBucket[];
}

interface TooltipEntry {
  color: string;
  name: string;
  value: number;
}

const COST_COLOR = '#f59e0b'; // amber-500

export function MonthlyChart({ buckets }: MonthlyChartProps) {
  const [brandColor, setBrandColor] = useState('#334155');
  useEffect(() => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue('--brand-primary')
      .trim();
    if (value) setBrandColor(value);
  }, []);

  const data = useMemo(
    () =>
      buckets.map((b) => ({
        period: shortMonth(b.period.year, b.period.month),
        comparaciones: b.metrics.numComparisons,
        coste: Number(b.metrics.geminiCostUsd.toFixed(4)),
      })),
    [buckets],
  );

  const hasData = data.some((d) => d.comparaciones > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Evolución mensual
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Últimos {buckets.length} meses
          </p>
        </div>
        <Legend brandColor={brandColor} />
      </div>

      {!hasData ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-400">
          Aún no hay actividad para mostrar.
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={brandColor} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={brandColor} stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={40}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={58}
                tickFormatter={(v: number) => `$${v.toFixed(v < 1 ? 3 : 0)}`}
              />
              <Tooltip
                cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                content={<CustomTooltip />}
              />
              <Bar
                yAxisId="left"
                dataKey="comparaciones"
                fill="url(#barGrad)"
                radius={[6, 6, 0, 0]}
                name="Comparaciones"
                maxBarSize={44}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="coste"
                stroke={COST_COLOR}
                strokeWidth={2.5}
                dot={{ r: 3, fill: COST_COLOR, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                name="Coste USD"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Legend({ brandColor }: { brandColor: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ background: brandColor }}
        />
        Comparaciones
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-sm"
          style={{ background: COST_COLOR }}
        />
        Coste USD
      </span>
    </div>
  );
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const comp = payload.find((p) => p.name === 'Comparaciones');
  const cost = payload.find((p) => p.name === 'Coste USD');
  return (
    <div className="min-w-[180px] rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      {comp && (
        <p className="flex items-center justify-between gap-2 text-xs text-slate-700">
          <span>Comparaciones</span>
          <span className="font-medium tabular-nums text-slate-900">
            {formatNumber(comp.value)}
          </span>
        </p>
      )}
      {cost && (
        <p className="flex items-center justify-between gap-2 text-xs text-slate-700">
          <span>Coste</span>
          <span className="font-medium tabular-nums text-slate-900">
            {formatUsd(cost.value)}
          </span>
        </p>
      )}
    </div>
  );
}

const SHORT_MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function shortMonth(year: number, month: number): string {
  return `${SHORT_MONTHS[month - 1]} ${String(year).slice(2)}`;
}
