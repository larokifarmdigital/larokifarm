'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DateRangePicker } from '@/shared/components/molecules/DateRangePicker';
import { Select } from '@/shared/components/molecules/Select';

interface BusinessOption {
  slug: string;
  name: string;
}

interface HistoryFiltersProps {
  showBusinessFilter: boolean;
  businesses?: BusinessOption[];
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'OK', label: 'OK' },
  { value: 'DISCREPANCIES', label: 'Discrepancias' },
  { value: 'ERROR', label: 'Error' },
];

export function HistoryFilters({
  showBusinessFilter,
  businesses = [],
}: HistoryFiltersProps) {
  const router = useRouter();
  const sp = useSearchParams();

  const [from, setFrom] = useState(sp.get('from') ?? '');
  const [to, setTo] = useState(sp.get('to') ?? '');
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [supplier, setSupplier] = useState(sp.get('supplier') ?? '');
  const [businessSlug, setBusinessSlug] = useState(sp.get('business') ?? '');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setFrom(sp.get('from') ?? '');
    setTo(sp.get('to') ?? '');
    setStatus(sp.get('status') ?? '');
    setSupplier(sp.get('supplier') ?? '');
    setBusinessSlug(sp.get('business') ?? '');
  }, [sp]);

  const activeFilters = useMemo(() => {
    const active: string[] = [];
    if (from || to) active.push('fecha');
    if (status) active.push('estado');
    if (supplier.trim()) active.push('proveedor');
    if (businessSlug.trim()) active.push('negocio');
    return active;
  }, [from, to, status, supplier, businessSlug]);

  const activeCount = activeFilters.length;
  const hasAnyFilter = activeCount > 0;

  const businessOptions = useMemo(
    () => [
      { value: '', label: 'Todos los negocios' },
      ...businesses.map((b) => ({ value: b.slug, label: b.name })),
    ],
    [businesses],
  );

  function apply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (status) params.set('status', status);
    if (supplier.trim()) params.set('supplier', supplier.trim());
    if (businessSlug.trim()) params.set('business', businessSlug.trim());
    router.push(
      `/historial${params.toString() ? `?${params.toString()}` : ''}`,
    );
    setMobileOpen(false);
  }

  function clear() {
    setFrom('');
    setTo('');
    setStatus('');
    setSupplier('');
    setBusinessSlug('');
    router.push('/historial');
    setMobileOpen(false);
  }

  const gridCls = showBusinessFilter
    ? 'lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'
    : 'lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)_auto]';
  // Los botones ocupan la última columna EN DESKTOP. En móvil / tablet
  // fluyen naturalmente en su propia fila para no forzar overflow.
  const actionsCls = showBusinessFilter
    ? 'sm:col-span-2 lg:col-span-1 lg:col-start-5'
    : 'sm:col-span-2 lg:col-span-1 lg:col-start-4';

  return (
    <div>
      {/* Toggle móvil (siempre visible en < md) */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="mb-3 flex w-full items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 md:hidden"
        aria-expanded={mobileOpen}
      >
        <span className="flex items-center gap-2">
          <FilterIcon />
          Filtros avanzados
          {activeCount > 0 && (
            <span
              className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-semibold"
              style={{
                background: 'var(--brand-primary)',
                color: 'var(--brand-foreground)',
              }}
            >
              {activeCount}
            </span>
          )}
        </span>
        <ChevronIcon open={mobileOpen} />
      </button>

      <form
        onSubmit={apply}
        className={`grid-cols-1 items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 ${gridCls} ${
          mobileOpen ? 'grid' : 'hidden'
        } md:grid`}
      >
        <Field label="Rango de fechas">
          <DateRangePicker
            from={from}
            to={to}
            onChange={({ from: f, to: t }) => {
              setFrom(f);
              setTo(t);
            }}
          />
        </Field>

        <Field label="Estado">
          <Select
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS}
            placeholder="Todos los estados"
          />
        </Field>

        <Field label="Proveedor">
          <input
            type="text"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Nestlé, Peroxfarma…"
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-transparent focus:outline-none focus:ring-2"
            style={{
              ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
            }}
          />
        </Field>

        {showBusinessFilter && (
          <Field label="Negocio">
            <Select
              value={businessSlug}
              onChange={setBusinessSlug}
              options={businessOptions}
              placeholder="Todos los negocios"
              searchable={businessOptions.length > 6}
            />
          </Field>
        )}

        <div className={`flex flex-wrap items-center gap-2 ${actionsCls}`}>
          <button
            type="submit"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold shadow-sm transition-colors sm:flex-none"
            style={{
              background: 'var(--brand-primary)',
              color: 'var(--brand-foreground)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'var(--brand-primary-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'var(--brand-primary)';
            }}
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={clear}
            disabled={!hasAnyFilter}
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-slate-50 sm:flex-none"
          >
            Limpiar
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function FilterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
