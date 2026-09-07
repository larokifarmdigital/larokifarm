'use client';

import type { ComparisonRow } from '@/core/domain/models';

export interface PriceChartProps {
  rows: ComparisonRow[];
  moneda: string;
}

/** Colores del marcador según posición relativa en el rango (0 = mejor precio, 1 = peor). */
function markerColor(position: number): string {
  if (position < 0.33) return '#059669'; // emerald-600
  if (position < 0.66) return '#d97706'; // amber-600
  return '#e11d48'; // rose-600
}

function formatPrice(precio: number, moneda: string): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(precio);
}

/**
 * Mini visualización SVG: barra horizontal del rango min→max con un marker por farmacia.
 * Hover sobre cada punto muestra tooltip con nombre + precio.
 * Todo inline SVG — sin libs de charting.
 */
export function PriceChart({ rows, moneda }: PriceChartProps) {
  const okRows = rows.filter(
    (r): r is ComparisonRow & { precio: number } =>
      r.status === 'ok' && typeof r.precio === 'number' && r.precio > 0,
  );

  if (okRows.length < 2) return null;

  const prices = okRows.map((r) => r.precio);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min;
  const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const median = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)];

  // Padding lateral para que los markers extremos no se corten
  const PAD_X = 12;
  const WIDTH = 100; // usamos %, viewBox virtual escalable
  const HEIGHT = 60;

  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
      aria-label="Distribución visual de precios"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          Distribución de precios
        </h3>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-500">
          {okRows.length} farmacias · media {formatPrice(avg, moneda)} · mediana{' '}
          {formatPrice(median, moneda)}
        </span>
      </header>

      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-16 w-full"
          role="img"
          aria-label={`Rango de ${formatPrice(min, moneda)} a ${formatPrice(max, moneda)}`}
        >
          {/* Línea base */}
          <line
            x1={PAD_X}
            y1={HEIGHT / 2}
            x2={WIDTH - PAD_X}
            y2={HEIGHT / 2}
            stroke="currentColor"
            strokeWidth="0.4"
            className="text-zinc-200 dark:text-zinc-700"
          />

          {/* Marca de mediana */}
          {range > 0 && (
            <line
              x1={PAD_X + ((median - min) / range) * (WIDTH - 2 * PAD_X)}
              y1={HEIGHT / 2 - 6}
              x2={PAD_X + ((median - min) / range) * (WIDTH - 2 * PAD_X)}
              y2={HEIGHT / 2 + 6}
              stroke="currentColor"
              strokeWidth="0.4"
              strokeDasharray="1 1"
              className="text-zinc-400 dark:text-zinc-600"
            />
          )}

          {/* Un círculo por cada farmacia */}
          {okRows.map((row) => {
            const position = range > 0 ? (row.precio - min) / range : 0.5;
            const cx = PAD_X + position * (WIDTH - 2 * PAD_X);
            const color = markerColor(position);
            const tooltipLabel = `${row.pharmacyName}: ${formatPrice(row.precio, moneda)}`;
            return (
              <g key={row.pharmacyId}>
                <circle
                  cx={cx}
                  cy={HEIGHT / 2}
                  r="2.6"
                  fill={color}
                  fillOpacity="0.85"
                  className="transition-transform hover:scale-125"
                >
                  <title>{tooltipLabel}</title>
                </circle>
              </g>
            );
          })}
        </svg>

        {/* Etiquetas de extremos + mediana */}
        <div className="mt-1 flex justify-between text-[10px] font-medium text-zinc-500 dark:text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            Min {formatPrice(min, moneda)}
          </span>
          {range > 0 && (
            <span className="hidden text-zinc-400 dark:text-zinc-600 sm:inline">
              ← ahorro hasta {formatPrice(range, moneda)} →
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            Max {formatPrice(max, moneda)}
            <span className="h-2 w-2 rounded-full bg-rose-600" />
          </span>
        </div>
      </div>
    </section>
  );
}
