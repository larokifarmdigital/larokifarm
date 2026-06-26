'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
// Import directo al sub-barrel `domain` para no arrastrar adapters server-only
// (StorageLocal usa `node:crypto`) al bundle cliente.
import { formatPeriod, type MonthlyBucket } from '@/shared/core/domain';

interface MonthlyChartProps {
  buckets: MonthlyBucket[];
}

export function MonthlyChart({ buckets }: MonthlyChartProps) {
  const data = buckets.map((b) => ({
    period: formatPeriod(b.period),
    comparaciones: b.metrics.numComparisons,
    tokens: b.metrics.geminiInputTokens + b.metrics.geminiOutputTokens,
    costeUsd: Number(b.metrics.geminiCostUsd.toFixed(4)),
  }));

  return (
    <div className="rounded-md border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
        Evolución mensual ({buckets.length} meses)
      </h2>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11 }}
              label={{ value: 'Comparaciones', angle: -90, position: 'insideLeft', fontSize: 11 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              label={{ value: 'Coste USD', angle: 90, position: 'insideRight', fontSize: 11 }}
            />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="comparaciones" fill="#3b82f6" name="Comparaciones" />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="costeUsd"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="Coste USD"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
