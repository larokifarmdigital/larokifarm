import type { ComparisonReport, ComparisonRow } from '../../domain/models';

export type ComparisonTableProps = { report: ComparisonReport };

/* Ordena por precio asc; las filas sin precio (error/not-found) van al final. */
function sortByPrice(rows: ComparisonRow[]): ComparisonRow[] {
  return [...rows].sort((a, b) => {
    const av = a.status === 'ok' && a.precio != null ? a.precio : Number.POSITIVE_INFINITY;
    const bv = b.status === 'ok' && b.precio != null ? b.precio : Number.POSITIVE_INFINITY;
    return av - bv;
  });
}

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
  const confianza = row.precioConfianza;
  const urlOk = row.urlVerificada;
  if (urlOk && confianza !== 'bajo') return null; // caso ideal: sin badge
  if (!urlOk && confianza === 'bajo') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 ring-1 ring-inset ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60"
        title="URL no verificada + precio poco fiable. Confirma manualmente en la farmacia."
      >
        ⚠︎ Sin verificar
      </span>
    );
  }
  if (!urlOk) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60"
        title="La URL específica del producto no fue verificada por Google. El link te lleva a búsqueda en Google."
      >
        ⚠︎ URL sin verificar
      </span>
    );
  }
  // urlOk pero precioConfianza=bajo
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60"
      title="Precio inferido, puede no ser exacto. Verifica en la ficha del producto."
    >
      ⚠︎ Precio aproximado
    </span>
  );
}

/** Solo hay redirección si Google verificó la URL. Sin URL verificada, la card no es clicable. */
function hasClickableLink(row: ComparisonRow): boolean {
  return Boolean(row.urlVerificada && row.productUrl);
}

export function ComparisonTable({ report }: ComparisonTableProps) {
  const rows = sortByPrice(report.rows);
  const okRows = rows.filter((r) => r.status === 'ok');
  const errorRows = rows.filter((r) => r.status !== 'ok');
  const mejorPrecio = okRows.length > 0 ? okRows[0].precio : undefined;

  return (
    <div className="space-y-4">
      {/* Producto identificado por Gemini a partir de los resultados de Google */}
      {report.product && (
        <div className="rounded-lg border border-sky-200 bg-sky-50/50 px-5 py-4 dark:border-sky-900 dark:bg-sky-950/20">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
            Producto identificado
          </div>
          <h2 className="text-lg font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
            {report.product.nombre}
          </h2>
          {(report.product.presentacion || report.product.fabricante) && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {report.product.presentacion}
              {report.product.presentacion && report.product.fabricante ? ' · ' : ''}
              {report.product.fabricante}
            </p>
          )}
          <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-500">
            Verifica que sea el producto que buscabas. Si no coincide, corregí el nombre en el
            formulario y vuelve a buscar.
          </p>
        </div>
      )}

      {/* Cabecera con contexto de la búsqueda */}
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">Buscado:</span>
          {report.input.cn && (
            <span className="rounded bg-white px-2 py-0.5 font-mono text-xs text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-300 dark:ring-zinc-800">
              CN {report.input.cn}
            </span>
          )}
          {report.input.ean && (
            <span className="rounded bg-white px-2 py-0.5 font-mono text-xs text-zinc-700 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-300 dark:ring-zinc-800">
              EAN {report.input.ean}
            </span>
          )}
          {report.input.nombre && (
            <span className="italic text-zinc-700 dark:text-zinc-300">
              "{report.input.nombre}"
            </span>
          )}
        </div>
        <div className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-500">
          {okRows.length} farmacia{okRows.length === 1 ? '' : 's'} con precio ·{' '}
          {report.totalMs}ms · fuente: Google via Gemini
        </div>
      </div>

      {/* Grid de tarjetas de farmacias */}
      {okRows.length === 0 && errorRows.length > 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-950">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            No se encontraron precios verificables
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            {errorRows[0].errorMessage ??
              'Gemini no pudo verificar el producto en farmacias online.'}
          </p>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
            Probá añadiendo el nombre del producto si buscaste solo por código.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {okRows.map((row, idx) => {
            const esMejor = row.precio === mejorPrecio && idx === 0;
            const hostname = hostnameFrom(row.productUrl);
            const clickable = hasClickableLink(row);
            const cardClass = `block rounded-lg border p-4 transition ${
              esMejor
                ? 'border-emerald-400 bg-emerald-50/40 dark:border-emerald-700 dark:bg-emerald-950/20'
                : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950'
            } ${clickable ? 'group hover:border-sky-500 hover:shadow-sm dark:hover:border-sky-500' : 'opacity-95'}`;

            const content = (
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Columna izquierda: nombre + url + badges */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3
                      className={`truncate text-base font-semibold text-zinc-900 dark:text-zinc-100 ${
                        clickable
                          ? 'group-hover:text-sky-700 dark:group-hover:text-sky-400'
                          : ''
                      }`}
                    >
                      {row.pharmacyName}
                    </h3>
                    {esMejor && (
                      <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Mejor precio
                      </span>
                    )}
                    <DisponibilidadBadge estado={row.disponibilidad} />
                    <TrustBadge row={row} />
                  </div>
                  {hostname && (
                    <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-500">
                      {hostname}
                    </p>
                  )}
                </div>

                {/* Columna derecha: precio + CTA (solo si clickable) */}
                <div className="flex flex-col items-end gap-1">
                  {row.precio != null && (
                    <span
                      className={`text-xl font-bold tabular-nums ${
                        esMejor
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {formatPrice(row.precio, row.moneda ?? 'EUR')}
                    </span>
                  )}
                  {clickable ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 group-hover:text-sky-700 group-hover:underline dark:text-sky-400 dark:group-hover:text-sky-300">
                      Ver ficha
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 7h10v10" />
                        <path d="M7 17 17 7" />
                      </svg>
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">
                      Sin URL verificada
                    </span>
                  )}
                </div>
              </div>
            );

            return (
              <li key={row.pharmacyId}>
                {clickable ? (
                  <a
                    href={row.productUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cardClass}
                  >
                    {content}
                  </a>
                ) : (
                  <div className={cardClass}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Errores agrupados al final (si hay) */}
      {errorRows.length > 0 && okRows.length > 0 && (
        <details className="text-xs text-zinc-500 dark:text-zinc-500">
          <summary className="cursor-pointer select-none py-1 font-medium">
            {errorRows.length} sin precio verificable
          </summary>
          <ul className="mt-2 space-y-1 pl-2">
            {errorRows.map((r) => (
              <li key={r.pharmacyId}>
                {r.pharmacyName}: {r.errorMessage ?? 'no encontrado'}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
        Precios orientativos según información pública indexada por Google. Verificá en la
        farmacia antes de tomar decisiones.
      </p>
    </div>
  );
}
