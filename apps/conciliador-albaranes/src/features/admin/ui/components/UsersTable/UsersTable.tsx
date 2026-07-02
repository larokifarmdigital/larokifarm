'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Role } from '@/core/shared';
import type { UserRow } from '@/core/users';
import type { BusinessRow } from '@/core/businesses';
import { businessColor } from '@/features/history/lib/businessColor';
import { formatDateOnly } from '@/shared/lib/format';
import { deleteUserAction } from '../../../actions/users';
import { roleBadgeClass, roleLabel } from '../../../lib/roleLabel';
import { UserForm } from '../UserForm';
import {
  ConfirmDialog,
  EmptyState,
  Modal,
  Pagination,
} from '../shared/AdminDialogs';

interface UsersTableProps {
  users: UserRow[];
  rolesDisponibles: Role[];
  negocios: BusinessRow[];
  fijarBusiness: boolean;
  currentUserId: string;
  /** Si false, oculta el botón "Nuevo usuario". */
  showCreateButton?: boolean;
}

export function UsersTable({
  users,
  rolesDisponibles,
  negocios,
  fijarBusiness,
  currentUserId,
  showCreateButton = true,
}: UsersTableProps) {
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        (u.business?.name.toLowerCase().includes(q) ?? false),
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function confirmDelete() {
    if (!deleting) return;
    const u = deleting;
    startTransition(async () => {
      const r = await deleteUserAction(u.id);
      if (r.error) {
        toast.error(r.error);
      } else {
        toast.success(`Usuario ${u.email} eliminado`);
      }
      setDeleting(null);
    });
  }

  const isEmpty = users.length === 0;
  const isEmptyFiltered = !isEmpty && filtered.length === 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"
          >
            <SearchIcon />
          </span>
          <input
            type="search"
            placeholder="Buscar por email, nombre o negocio…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2"
            style={{
              ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
            }}
          />
        </div>
        {showCreateButton && !isEmpty && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm"
            style={{
              background: 'var(--brand-primary)',
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
            <PlusIcon /> Nuevo usuario
          </button>
        )}
      </div>

      {isEmpty ? (
        <EmptyState
          title="Aún no hay usuarios"
          description="Crea el primer usuario para empezar."
          ctaLabel={showCreateButton ? 'Crear primer usuario' : undefined}
          onCta={() => setCreating(true)}
        />
      ) : isEmptyFiltered ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No hay usuarios que coincidan con «{search}».
        </p>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Nombre</th>
                  <th className="px-3 py-2.5">Rol</th>
                  <th className="px-3 py-2.5">Negocio</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5">Creado</th>
                  <th
                    className="w-20 px-3 py-2.5 text-right"
                    aria-label="Acciones"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((u) => {
                  const bColor = businessColor(u.business?.slug);
                  return (
                    <tr
                      key={u.id}
                      className={
                        u.active
                          ? 'hover:bg-slate-50/70'
                          : 'bg-slate-50/50 text-slate-400 hover:bg-slate-100/50'
                      }
                    >
                      <td
                        className="whitespace-nowrap py-2.5 pl-3 pr-3"
                        style={{
                          boxShadow: `inset 4px 0 0 ${bColor}`,
                        }}
                      >
                        <span
                          className={`block max-w-[220px] truncate ${u.active ? 'font-medium text-slate-900' : ''}`}
                          title={u.email}
                        >
                          {u.email}
                        </span>
                      </td>
                      <TruncatedCell text={u.name} />
                      <td className="px-3 py-2.5">
                        <span className={roleBadgeClass(u.role)}>
                          {roleLabel(u.role, { short: true })}
                        </span>
                      </td>
                      <TruncatedCell text={u.business?.name ?? '—'} />
                      <td className="px-3 py-2.5">
                        <StatusPill active={u.active} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">
                        {formatDateOnly(u.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <IconAction
                            onClick={() => setEditing(u)}
                            title="Editar usuario"
                          >
                            <PencilIcon />
                          </IconAction>
                          {u.id !== currentUserId && (
                            <IconAction
                              onClick={() => setDeleting(u)}
                              disabled={pending}
                              title="Eliminar usuario"
                              variant="danger"
                            >
                              <TrashIcon />
                            </IconAction>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Móvil: cards */}
          <ul className="space-y-3 md:hidden">
            {paginated.map((u) => {
              const bColor = businessColor(u.business?.slug);
              return (
                <li
                  key={u.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4"
                  style={{ borderLeft: `4px solid ${bColor}` }}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className="truncate font-semibold text-slate-900"
                        title={u.name}
                      >
                        {u.name}
                      </p>
                      <p
                        className="mt-0.5 truncate text-xs text-slate-500"
                        title={u.email}
                      >
                        {u.email}
                      </p>
                    </div>
                    <StatusPill active={u.active} />
                  </div>

                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={roleBadgeClass(u.role)}>
                      {roleLabel(u.role, { short: true })}
                    </span>
                    {u.business?.name && (
                      <span
                        className="truncate text-xs text-slate-500"
                        title={u.business.name}
                      >
                        · {u.business.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-400">
                      Creado {formatDateOnly(u.createdAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      <IconAction
                        onClick={() => setEditing(u)}
                        title="Editar usuario"
                      >
                        <PencilIcon />
                      </IconAction>
                      {u.id !== currentUserId && (
                        <IconAction
                          onClick={() => setDeleting(u)}
                          disabled={pending}
                          title="Eliminar usuario"
                          variant="danger"
                        >
                          <TrashIcon />
                        </IconAction>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </>
      )}

      {editing && (
        <Modal
          title="Editar usuario"
          description={editing.email}
          onClose={() => setEditing(null)}
        >
          <UserForm
            user={editing}
            rolesDisponibles={rolesDisponibles}
            negocios={negocios}
            fijarBusiness={fijarBusiness}
            onSuccess={() => setEditing(null)}
          />
        </Modal>
      )}

      {creating && (
        <Modal
          title="Nuevo usuario"
          description="Crea un usuario del panel de administración."
          onClose={() => setCreating(false)}
        >
          <UserForm
            rolesDisponibles={rolesDisponibles}
            negocios={negocios}
            fijarBusiness={fijarBusiness}
            onSuccess={() => setCreating(false)}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar usuario"
          description={
            <>
              ¿Seguro que quieres eliminar a{' '}
              <strong>{deleting.email}</strong>? Esta acción no se puede
              deshacer.
            </>
          }
          confirmLabel={pending ? 'Eliminando…' : 'Eliminar'}
          confirmVariant="danger"
          pending={pending}
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

/* --------------------------------- Sub UI --------------------------------- */

function TruncatedCell({ text }: { text: string }) {
  return (
    <td className="max-w-[220px] px-3 py-2.5">
      <span className="block truncate text-slate-700" title={text}>
        {text}
      </span>
    </td>
  );
}

function StatusPill({ active }: { active: boolean }) {
  const cls = active
    ? 'bg-green-50 text-green-700 ring-green-200'
    : 'bg-slate-100 text-slate-500 ring-slate-200';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function IconAction({
  children,
  onClick,
  disabled,
  title,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  variant?: 'default' | 'danger';
}) {
  const base =
    'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40';
  const styleCls =
    variant === 'danger'
      ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`${base} ${styleCls}`}
    >
      {children}
    </button>
  );
}

/* --------------------------------- Icons ---------------------------------- */

function SearchIcon() {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilIcon() {
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
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}
