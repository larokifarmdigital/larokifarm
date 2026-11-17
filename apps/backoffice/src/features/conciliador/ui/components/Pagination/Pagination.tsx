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
  if (total === 0) return null;

  if (totalPages <= 1) {
    return (
      <p className="mt-4 text-xs text-slate-500">
        {total} {total === 1 ? 'resultado' : 'resultados'}.
      </p>
    );
  }

  const items = paginate(page, totalPages);

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
      <span>
        Página <strong className="text-slate-900">{page}</strong> de{' '}
        <strong className="text-slate-900">{totalPages}</strong>{' '}
        <span className="text-slate-400">·</span> {total}{' '}
        {total === 1 ? 'resultado' : 'resultados'}
      </span>

      <div className="flex items-center gap-1">
        <PageBtn
          href={buildHref(1)}
          disabled={page === 1}
          title="Primera página"
          ariaLabel="Primera página"
        >
          <ChevronsLeft />
        </PageBtn>

        <PageBtn
          href={buildHref(page - 1)}
          disabled={page === 1}
          title="Anterior"
          ariaLabel="Anterior"
        >
          <ChevronLeft />
        </PageBtn>

        {items.map((it, i) =>
          it === 'ellipsis' ? (
            <span
              key={`ell-${i}`}
              className="inline-flex h-7 w-7 items-center justify-center text-slate-400"
              aria-hidden
            >
              …
            </span>
          ) : (
            <PageNumBtn
              key={it}
              href={buildHref(it)}
              active={it === page}
              label={String(it)}
            />
          ),
        )}

        <PageBtn
          href={buildHref(page + 1)}
          disabled={page === totalPages}
          title="Siguiente"
          ariaLabel="Siguiente"
        >
          <ChevronRight />
        </PageBtn>

        <PageBtn
          href={buildHref(totalPages)}
          disabled={page === totalPages}
          title="Última página"
          ariaLabel="Última página"
        >
          <ChevronsRight />
        </PageBtn>
      </div>
    </nav>
  );
}

function paginate(current: number, total: number): (number | 'ellipsis')[] {
  const SIBLINGS = 1;
  const totalNumbersToShow = SIBLINGS * 2 + 5;
  if (total <= totalNumbersToShow) return range(1, total);

  const leftSibling = Math.max(current - SIBLINGS, 1);
  const rightSibling = Math.min(current + SIBLINGS, total);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftCount = 3 + 2 * SIBLINGS;
    return [...range(1, leftCount), 'ellipsis', total];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    const rightCount = 3 + 2 * SIBLINGS;
    return [1, 'ellipsis', ...range(total - rightCount + 1, total)];
  }
  return [1, 'ellipsis', ...range(leftSibling, rightSibling), 'ellipsis', total];
}

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

function PageBtn({
  href,
  disabled,
  title,
  ariaLabel,
  children,
}: {
  href: string;
  disabled: boolean;
  title: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const cls =
    'inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs font-medium';
  if (disabled) {
    return (
      <span
        className={`${cls} border-slate-200 bg-slate-50 text-slate-300`}
        aria-disabled
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      title={title}
      aria-label={ariaLabel}
      className={`${cls} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
    >
      {children}
    </Link>
  );
}

function PageNumBtn({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  const base =
    'inline-flex h-7 min-w-[28px] items-center justify-center rounded-md px-1.5 text-xs font-medium';
  if (active) {
    return (
      <span
        className={base}
        style={{
          background: 'var(--brand-primary)',
          color: 'var(--brand-foreground)',
        }}
        aria-current="page"
      >
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className={`${base} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
    >
      {label}
    </Link>
  );
}

function ChevronLeft() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ChevronsLeft() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </svg>
  );
}

function ChevronsRight() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 17 5-5-5-5" />
      <path d="m13 17 5-5-5-5" />
    </svg>
  );
}
