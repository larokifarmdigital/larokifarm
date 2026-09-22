'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import type { FarmaciaSummary, FarmaciaStatus, Locale } from '@/types/content';
import { LOCALE_LABELS } from '@/types/content';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/features/shell/NavIcon';
import { cn, formatRelativeDate } from '@/lib/utils';
import {
  archiveFarmaciaAction,
  duplicateFarmaciaAction,
  publishFarmaciaAction,
} from '@/lib/actions/farmacias-actions';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const STATUS_META: Record<FarmaciaStatus, { label: string; tone: 'green' | 'yellow' | 'neutral' }> = {
  published: { label: 'Publicada', tone: 'green' },
  draft: { label: 'Borrador', tone: 'yellow' },
  archived: { label: 'Archivada', tone: 'neutral' },
};

type StatusFilter = 'todos' | FarmaciaStatus;

export function FarmaciasList({ farmacias }: { farmacias: FarmaciaSummary[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('todos');
  const [pendingTx, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return farmacias.filter((f) => {
      if (status !== 'todos' && f.status !== status) return false;
      if (!q) return true;
      return (
        f.nombre.toLowerCase().includes(q) ||
        f.slug.toLowerCase().includes(q) ||
        (f.ciudad ?? '').toLowerCase().includes(q)
      );
    });
  }, [farmacias, query, status]);

  const counts = useMemo(() => {
    const c = { todos: farmacias.length, published: 0, draft: 0, archived: 0 };
    for (const f of farmacias) c[f.status]++;
    return c;
  }, [farmacias]);

  return (
    <section aria-label="Listado de farmacias">
      <div className="flex flex-col gap-2.5 mb-4 sm:mb-5 sm:flex-row sm:items-center sm:gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <NavIcon
            name="MagnifyingGlass"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, slug o ciudad…"
            aria-label="Buscar farmacia"
            className="pl-9"
          />
        </div>
        <div className="-mx-3 sm:mx-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[6px] p-0.5 mx-3 sm:mx-0">
            {(['todos', 'published', 'draft', 'archived'] as StatusFilter[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setStatus(k)}
                aria-pressed={status === k}
                className={cn(
                  'shrink-0 px-3 h-8 text-[12.5px] rounded-[4px] transition-colors whitespace-nowrap',
                  status === k
                    ? 'bg-[var(--color-surface-sunken)] text-[var(--color-ink)] font-medium'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-ink-2)]',
                )}
              >
                {k === 'todos' ? 'Todas' : STATUS_META[k as FarmaciaStatus].label}
                <span className="ml-1.5 text-[var(--color-muted-2)]">
                  {counts[k === 'todos' ? 'todos' : k]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState hasQuery={Boolean(query) || status !== 'todos'} totalCount={farmacias.length} />
      ) : (
        <>
          {/* Móvil: cards apiladas */}
          <ul className="md:hidden space-y-2">
            {filtered.map((f) => {
              const st = STATUS_META[f.status];
              const dimmed = f.status === 'archived';
              return (
                <li
                  key={f.id}
                  className={cn(
                    'card p-3 flex items-center gap-3',
                    dimmed && 'opacity-70',
                  )}
                >
                  <Link
                    href={`/farmacias/${f.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-[4px]"
                  >
                    <span className="relative shrink-0 h-10 w-10 rounded-[6px] overflow-hidden bg-[var(--color-surface-sunken)] border border-[var(--color-hairline)]">
                      {f.logo ? (
                        <Image src={f.logo.url} alt="" width={40} height={40} className="object-cover" unoptimized />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center text-[15px] font-semibold text-[var(--color-muted-2)]">
                          {f.nombre[0]}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-[15px] font-medium text-[var(--color-ink)] truncate">
                          {f.nombre}
                        </span>
                        <Chip tone={st.tone}>{st.label}</Chip>
                      </span>
                      <span className="flex items-center gap-2 text-[12px] text-[var(--color-muted)] mt-0.5 flex-wrap">
                        <span className="font-mono-tabular truncate">/{f.slug}</span>
                        {f.ciudad && <><span aria-hidden>·</span><span>{f.ciudad}</span></>}
                        <span aria-hidden>·</span>
                        <span>{formatRelativeDate(f.updatedAt)}</span>
                      </span>
                    </span>
                  </Link>
                  <RowActions
                    farmacia={f}
                    pending={pendingTx}
                    onAction={(fn) => startTransition(fn)}
                  />
                </li>
              );
            })}
          </ul>

          {/* Desktop: tabla */}
          <div className="hidden md:block card overflow-hidden">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="border-b border-[var(--color-hairline)] text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
                <th className="pl-4 pr-2 py-2.5 font-medium">Farmacia</th>
                <th className="px-2 py-2.5 font-medium">Ciudad</th>
                <th className="px-2 py-2.5 font-medium hidden lg:table-cell">Idiomas</th>
                <th className="px-2 py-2.5 font-medium">Estado</th>
                <th className="px-2 py-2.5 font-medium hidden lg:table-cell">Actualizado</th>
                <th className="pl-2 pr-4 py-2.5 font-medium text-right w-14">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => {
                const st = STATUS_META[f.status];
                const dimmed = f.status === 'archived';
                return (
                  <tr
                    key={f.id}
                    className={cn(
                      'group border-b border-[var(--color-hairline)] last:border-b-0 hover:bg-[var(--color-surface-sunken)]/60 transition-colors',
                      i % 2 === 1 && 'bg-[var(--color-surface-2)]',
                      dimmed && 'opacity-70',
                    )}
                  >
                    <td className="pl-4 pr-2 py-3">
                      <Link
                        href={`/farmacias/${f.id}`}
                        className="flex items-center gap-3 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] rounded-[4px]"
                      >
                        <span className="relative shrink-0 h-9 w-9 rounded-[6px] overflow-hidden bg-[var(--color-surface-sunken)] border border-[var(--color-hairline)]">
                          {f.logo ? (
                            <Image
                              src={f.logo.url}
                              alt=""
                              width={36}
                              height={36}
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="absolute inset-0 grid place-items-center text-[13px] font-semibold text-[var(--color-muted-2)]">
                              {f.nombre[0]}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[var(--color-ink)] font-medium">
                            {f.nombre}
                          </span>
                          <span className="block truncate text-[12px] text-[var(--color-muted)] font-mono-tabular">
                            /{f.slug}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-2 py-3 text-[var(--color-ink-2)]">
                      {f.ciudad ?? <span className="text-[var(--color-muted-2)]">—</span>}
                    </td>
                    <td className="px-2 py-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        {f.idiomasActivos.map((l) => (
                          <span
                            key={l}
                            title={LOCALE_LABELS[l as Locale]}
                            className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-ink-2)] bg-[var(--color-surface-sunken)] rounded px-1.5 py-0.5 font-mono"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <Chip tone={st.tone}>{st.label}</Chip>
                    </td>
                    <td className="px-2 py-3 text-[13px] text-[var(--color-muted)] hidden lg:table-cell">
                      {formatRelativeDate(f.updatedAt)}
                    </td>
                    <td className="pl-2 pr-3 py-3 text-right">
                      <RowActions
                        farmacia={f}
                        pending={pendingTx}
                        onAction={(fn) => startTransition(fn)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </>
      )}
    </section>
  );
}

function RowActions({
  farmacia,
  pending,
  onAction,
}: {
  farmacia: FarmaciaSummary;
  pending: boolean;
  onAction: (fn: () => void) => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Acciones para ${farmacia.nombre}`}
        disabled={pending}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        <NavIcon name="DotsSixVertical" size={16} weight="bold" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="min-w-[200px] bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[8px] shadow-[var(--shadow-elevated)] p-1 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item asChild>
            <Link
              href={`/farmacias/${farmacia.id}`}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none"
            >
              <NavIcon name="PencilSimple" size={13} /> Editar
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              onAction(async () => {
                await duplicateFarmaciaAction(farmacia.id);
                toast.success(`"${farmacia.nombre}" duplicada`);
              });
            }}
          >
            <NavIcon name="Copy" size={13} /> Duplicar
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <a
              href={`https://larokifarm.com/${farmacia.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none"
            >
              <NavIcon name="ArrowSquareOut" size={13} /> Ver landing
            </a>
          </DropdownMenu.Item>
          {farmacia.status === 'published' ? (
            <DropdownMenu.Item
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                onAction(async () => {
                  await publishFarmaciaAction(farmacia.id, false);
                  toast.success(`"${farmacia.nombre}" pasada a borrador`);
                });
              }}
            >
              <NavIcon name="PencilSimple" size={13} /> Pasar a borrador
            </DropdownMenu.Item>
          ) : farmacia.status === 'draft' ? (
            <DropdownMenu.Item
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-green-ink)] hover:bg-[var(--color-green-soft)] outline-none cursor-pointer"
              onSelect={(e) => {
                e.preventDefault();
                onAction(async () => {
                  await publishFarmaciaAction(farmacia.id, true);
                  toast.success(`"${farmacia.nombre}" publicada`);
                });
              }}
            >
              <NavIcon name="Check" size={13} /> Publicar ahora
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Separator className="h-px bg-[var(--color-hairline)] my-1" />
          <DropdownMenu.Item
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)] outline-none cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              onAction(async () => {
                await archiveFarmaciaAction(farmacia.id);
                toast.message(`"${farmacia.nombre}" archivada`);
              });
            }}
          >
            <NavIcon name="Archive" size={13} /> Archivar
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function EmptyState({ hasQuery, totalCount }: { hasQuery: boolean; totalCount: number }) {
  if (hasQuery) {
    return (
      <div className="card p-12 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center mb-4">
          <NavIcon
            name="MagnifyingGlassPlus"
            size={20}
            className="text-[var(--color-muted)]"
          />
        </div>
        <p className="text-[14px] text-[var(--color-ink-2)]">
          No hay farmacias que coincidan con la búsqueda.
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">
          Revisa los filtros o cambia el término de búsqueda.
        </p>
      </div>
    );
  }
  if (totalCount === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-5">
          <NavIcon
            name="Storefront"
            size={24}
            weight="fill"
            className="text-[var(--color-accent)]"
          />
        </div>
        <h2 className="h-section m-0">Aún no hay farmacias</h2>
        <p className="mt-2 text-[14px] text-[var(--color-muted)] max-w-md mx-auto text-pretty">
          Crea la primera para empezar a publicar contenido en la web.
        </p>
        <div className="mt-6">
          <Button asChild variant="accent" size="md">
            <Link href="/farmacias/nueva">
              <NavIcon name="Plus" size={14} />
              Crear primera farmacia
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  return null;
}
