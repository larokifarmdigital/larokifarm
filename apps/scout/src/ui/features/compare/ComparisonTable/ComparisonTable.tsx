'use client';

import { useMemo, useState } from 'react';
import type { ComparisonReport, ComparisonRow } from '@/core/domain/models';

export type ComparisonTableProps = { report: ComparisonReport };

type SortMode = 'price-asc' | 'price-desc' | 'name-asc';

function hostnameFrom(url: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function formatPrice(precio: number, moneda: string): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(precio);
}

/** Iniciales de la farmacia para el avatar. */
function initialsFrom(name: string): string {
  const clean = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Color estable derivado del nombre — para que cada farmacia tenga su avatar consistente. */
function avatarColor(name: string): string {
  const palette = [
    'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
    'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    'bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-300',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function DisponibilidadBadge({ estado }: { estado?: string }) {
  if (estado === 'en_stock') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> En stock
      </span>
    );
  }
  if (estado === 'agotado') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Agotado
      </span>
    );
  }
  return null;
}

function TrustBadge({ row }: { row: ComparisonRow }) {
  if (row.precioConfianza === 'medio') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60"
        title="Precio extraído por IA de la ficha. Verificá directamente en la tienda."
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /></svg>
        Aproximado
      </span>
    );
  }
  return null;
}

/** Card destacada del mejor precio — hero al inicio de los resultados. */
function BestPriceHero({ row, moneda, savings }: { row: ComparisonRow; moneda: string; savings?: number }) {
  const hostname = hostnameFrom(row.productUrl);
  const clickable = Boolean(row.productUrl);

  const inner = (
    <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-400/60 bg-gradient-to-br from-emerald-500 via-teal-500 to-teal-600 p-6 text-white shadow-lg dark:border-emerald-500/50 sm:p-7">
      {/* Decoración de fondo */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
              <path d="M12 2 15 8h6l-5 4 2 8-6-4-6 4 2-8-5-4h6z" />
            </svg>
            Mejor precio
          </div>
          <h3 className="line-clamp-2 break-words text-2xl font-bold leading-tight text-white sm:text-3xl" title={row.pharmacyName}>
            {row.pharmacyName}
          </h3>
          {hostname && !/google\./.test(hostname) && (
            <p className="mt-1 text-sm text-white/80">{hostname}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DisponibilidadBadge estado={row.disponibilidad} />
            {savings != null && savings > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                Ahorrás hasta {formatPrice(savings, moneda)}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          {row.precio != null && (
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/70">Precio</div>
              <div className="text-4xl font-extrabold tabular-nums leading-none sm:text-5xl">
                {formatPrice(row.precio, row.moneda ?? moneda)}
              </div>
            </div>
          )}
          {clickable && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition-transform group-hover:scale-105">
              Ver en {row.pharmacyName}
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 7h10v10" />
                <path d="M7 17 17 7" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return clickable ? (
    <a
      href={row.productUrl!}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      {inner}
    </a>
  ) : (
    <div>{inner}</div>
  );
}

/** Card compacta con avatar, ranking, barra de posición de precio y CTA. */
function CompactRow({
  row,
  rank,
  minPrice,
  maxPrice,
  moneda,
}: {
  row: ComparisonRow;
  rank: number;
  minPrice: number;
  maxPrice: number;
  moneda: string;
}) {
  const hostname = hostnameFrom(row.productUrl);
  const clickable = Boolean(row.productUrl);
  const precio = row.precio ?? 0;
  // Posición del precio en el rango 0..1 (0 = mejor, 1 = peor)
  const range = maxPrice - minPrice;
  const position = range > 0 ? (precio - minPrice) / range : 0;
  const barColor =
    position < 0.33
      ? 'bg-emerald-500'
      : position < 0.66
        ? 'bg-amber-500'
        : 'bg-rose-500';

  const inner = (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-teal-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-teal-600">
      <div className="flex items-start gap-3">
        {/* Ranking + avatar */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600">
            #{rank}
          </span>
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${avatarColor(row.pharmacyName)}`}
            aria-hidden="true"
          >
            {initialsFrom(row.pharmacyName)}
          </div>
        </div>

        {/* Info + barra de posición */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {row.pharmacyName}
              </h3>
              {hostname && !/google\./.test(hostname) && (
                <p className="mt-0.5 truncate text-[11px] text-zinc-500 dark:text-zinc-500">
                  {hostname}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <DisponibilidadBadge estado={row.disponibilidad} />
                <TrustBadge row={row} />
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold tabular-nums leading-none text-zinc-900 dark:text-zinc-100">
                {row.precio != null && formatPrice(row.precio, row.moneda ?? moneda)}
              </div>
              {range > 0 && (
                <div className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-600">
                  {position === 0
                    ? 'más barato'
                    : `+${formatPrice(precio - minPrice, moneda)}`}
                </div>
              )}
            </div>
          </div>

          {/* Barra visual: posición del precio en el rango min→max */}
          {range > 0 && (
            <div className="mt-3">
              <div className="relative h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
                  style={{ width: `${Math.max(4, position * 100)}%` }}
                />
                <div
                  className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${barColor}`}
                  style={{ left: `${position * 100}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] font-medium text-zinc-400 dark:text-zinc-600">
                <span>{formatPrice(minPrice, moneda)}</span>
                <span>{formatPrice(maxPrice, moneda)}</span>
              </div>
            </div>
          )}

          {/* CTA */}
          {clickable && (
            <div className="mt-2 text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300">
                Ver en tienda
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 7h10v10" />
                  <path d="M7 17 17 7" />
                </svg>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return clickable ? (
    <a href={row.productUrl!} target="_blank" rel="noopener noreferrer" className="block">
      {inner}
    </a>
  ) : (
    <div>{inner}</div>
  );
}

/** Card cuando NO hubo identificación por CIMA: muestra los términos buscados con chips
 *  bonitos, útil para el usuario recordar qué escribió. */
function SearchTermsCard({ input }: { input: ComparisonReport['input'] }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
          Términos de búsqueda
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {input.cn && (
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 font-mono text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <span className="rounded bg-teal-600 px-1 text-[9px] font-semibold text-white">CN</span>
              {input.cn}
            </span>
          )}
          {input.ean && (
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 font-mono text-[11px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              <span className="rounded bg-teal-600 px-1 text-[9px] font-semibold text-white">EAN</span>
              {input.ean}
            </span>
          )}
          {input.nombreHint && (
            <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-1 text-[12px] font-medium italic text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
              {input.nombreHint}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Card producto identificado (CIMA) — con icono pastilla, más presencia. */
function ProductCard({ product }: { product: NonNullable<ComparisonReport['product']> }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 dark:border-teal-900/60 dark:from-teal-950/20 dark:to-zinc-950">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.5 20.5 3.5 13.5a5 5 0 0 1 0-7.07l0 0a5 5 0 0 1 7.07 0L20.5 16.5a3 3 0 0 1 0 4.24l0 0a3 3 0 0 1-4.24 0z" />
          <path d="m8.5 8.5 7 7" />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
          Producto identificado
        </div>
        <h2 className="mt-0.5 text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
          {product.nombre}
        </h2>
        {(product.presentacion || product.fabricante) && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {product.presentacion}
            {product.presentacion && product.fabricante ? ' · ' : ''}
            {product.fabricante}
          </p>
        )}
      </div>
    </div>
  );
}

/** Botones de sort compactos. */
function SortButtons({ value, onChange }: { value: SortMode; onChange: (v: SortMode) => void }) {
  const options: { key: SortMode; label: string }[] = [
    { key: 'price-asc', label: 'Menor precio' },
    { key: 'price-desc', label: 'Mayor precio' },
    { key: 'name-asc', label: 'Farmacia (A-Z)' },
  ];
  return (
    <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-0.5 dark:border-zinc-800 dark:bg-zinc-950">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            value === opt.key
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ComparisonTable({ report }: ComparisonTableProps) {
  const [sort, setSort] = useState<SortMode>('price-asc');
  const [onlyInStock, setOnlyInStock] = useState(false);

  const okRows = useMemo(() => report.rows.filter((r) => r.status === 'ok'), [report.rows]);
  const errorRows = useMemo(() => report.rows.filter((r) => r.status !== 'ok'), [report.rows]);

  const moneda = okRows[0]?.moneda ?? 'EUR';
  const minPrice = okRows.length ? Math.min(...okRows.map((r) => r.precio ?? Infinity)) : 0;
  const maxPrice = okRows.length ? Math.max(...okRows.map((r) => r.precio ?? -Infinity)) : 0;
  const savings = maxPrice - minPrice;

  const filteredSorted = useMemo(() => {
    let list = okRows;
    if (onlyInStock) list = list.filter((r) => r.disponibilidad === 'en_stock');
    const sorted = [...list].sort((a, b) => {
      if (sort === 'price-asc') return (a.precio ?? 0) - (b.precio ?? 0);
      if (sort === 'price-desc') return (b.precio ?? 0) - (a.precio ?? 0);
      return a.pharmacyName.localeCompare(b.pharmacyName, 'es');
    });
    return sorted;
  }, [okRows, sort, onlyInStock]);

  const bestRow = okRows.length > 0 ? [...okRows].sort((a, b) => (a.precio ?? 0) - (b.precio ?? 0))[0] : null;
  const restRows = filteredSorted.filter((r) => r !== bestRow);

  return (
    <div className="space-y-5">
      {/* Producto identificado + chips del input */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-stretch">
        {report.product ? (
          <ProductCard product={report.product} />
        ) : (
          <SearchTermsCard input={report.input} />
        )}
        <div className="flex flex-col justify-center rounded-xl border border-zinc-200 bg-white p-4 text-center sm:min-w-[140px] dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Farmacias</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {okRows.length}
          </div>
          <div className="text-[10px] text-zinc-400 dark:text-zinc-600">
            en {(report.totalMs / 1000).toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Hero: mejor precio */}
      {bestRow && (
        <BestPriceHero row={bestRow} moneda={moneda} savings={savings > 0 ? savings : undefined} />
      )}

      {/* Sort + Filter */}
      {okRows.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-500">Ordenar:</span>
            <SortButtons value={sort} onChange={setSort} />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-teal-600 focus:ring-teal-500 dark:border-zinc-600 dark:bg-zinc-800"
            />
            Solo en stock
          </label>
        </div>
      )}

      {/* Caso: cero precios verificables */}
      {okRows.length === 0 && errorRows.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-8 text-center dark:border-amber-900/50 dark:from-amber-950/20 dark:to-zinc-950">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            No se encontraron precios verificables
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
            {errorRows[0].errorMessage ??
              'No se pudo encontrar el producto en las farmacias configuradas.'}
          </p>
          <div className="mx-auto mt-4 max-w-md rounded-lg bg-white p-3 text-left text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            <p className="mb-1.5 font-semibold text-zinc-800 dark:text-zinc-200">Sugerencias:</p>
            <ul className="space-y-1 pl-4 [&_li]:list-disc [&_li]:marker:text-amber-500">
              <li>Probá con menos palabras (ej: solo marca + tamaño).</li>
              <li>Verificá que el nombre coincide con el rótulo comercial.</li>
              <li>Si es medicamento con receta, es posible que no se venda online.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Caso: filtro "Solo en stock" vació la lista */}
      {okRows.length > 0 && filteredSorted.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Ninguna farmacia con stock confirmado
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-500">
            Google Shopping no siempre expone la disponibilidad. Desactivá &quot;Solo en stock&quot;
            para ver todas las farmacias.
          </p>
          <button
            type="button"
            onClick={() => setOnlyInStock(false)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Mostrar todas
          </button>
        </div>
      )}

      {/* Caso: solo 1 resultado — el hero ya se mostró, mensaje sutil */}
      {okRows.length === 1 && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 px-4 py-3 text-center text-xs text-teal-800 dark:border-teal-900/40 dark:bg-teal-950/20 dark:text-teal-300">
          <span className="font-medium">Único resultado encontrado</span> — no hay más farmacias con este producto exacto en Google Shopping.
        </div>
      )}

      {/* Lista de "otras farmacias" (rank 2+) */}
      {restRows.length > 0 && (
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Otras farmacias ({restRows.length})
            </h4>
          </div>
          <ul className="space-y-2">
            {restRows.map((row, idx) => (
              <li key={row.pharmacyId}>
                <CompactRow
                  row={row}
                  rank={idx + 2 /* +2 porque el #1 va en el hero */}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  moneda={moneda}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Farmacias sin precio automático: mostradas siempre expandidas con card por farmacia */}
      {errorRows.length > 0 && okRows.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 to-white p-5 dark:border-amber-900/40 dark:from-amber-950/20 dark:to-zinc-950">
          <header className="mb-4 flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {errorRows.length} farmacia{errorRows.length === 1 ? '' : 's'} sin precio automático
              </h4>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                Encontramos el producto en {errorRows.length === 1 ? 'esta farmacia' : 'estas farmacias'} pero
                no pudimos extraer el precio (bloqueo antibot o markup no reconocido).
                <strong className="text-zinc-800 dark:text-zinc-200"> Hacé click para verificar el precio directamente.</strong>
              </p>
            </div>
          </header>

          <ul className="grid gap-2 sm:grid-cols-2">
            {errorRows.map((r) => {
              const clickable = Boolean(r.productUrl);
              const hostname = hostnameFrom(r.productUrl);
              const inner = (
                <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition-all hover:border-amber-400 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-amber-600">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${avatarColor(r.pharmacyName)}`}
                    aria-hidden="true"
                  >
                    {initialsFrom(r.pharmacyName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {r.pharmacyName}
                    </div>
                    {hostname && !/google\./.test(hostname) ? (
                      <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-500">{hostname}</div>
                    ) : (
                      <div className="truncate text-[11px] text-zinc-500 dark:text-zinc-500">
                        {r.errorMessage ?? 'Sin ficha directa'}
                      </div>
                    )}
                  </div>
                  {clickable && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 group-hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:group-hover:bg-amber-950/70">
                      Verificar
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 7h10v10" />
                        <path d="M7 17 17 7" />
                      </svg>
                    </span>
                  )}
                </div>
              );
              return (
                <li key={r.pharmacyId}>
                  {clickable ? (
                    <a
                      href={r.productUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
