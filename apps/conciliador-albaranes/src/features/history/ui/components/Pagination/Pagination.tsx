import Link from 'next/link';

export function Pagination({
  page,
  totalPages,
  total,
  buildHref,
}: {
  page: number;
  totalPages: number;
  total: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) {
    return (
      <p className="mt-3 text-sm text-gray-500">
        {total} {total === 1 ? 'resultado' : 'resultados'}.
      </p>
    );
  }

  return (
    <nav className="mt-3 flex items-center justify-between text-sm text-gray-600">
      <span>
        Página {page} de {totalPages} ({total} resultados)
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={buildHref(page - 1)}
            className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
          >
            ← Anterior
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={buildHref(page + 1)}
            className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
          >
            Siguiente →
          </Link>
        )}
      </div>
    </nav>
  );
}
