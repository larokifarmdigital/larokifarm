'use client';

import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { Role } from '@/core/shared';
import type { UserRow } from '@/core/users';
import type { BusinessRow } from '@/core/businesses';
import { deleteUserAction } from '../../../actions/users';
import { roleBadgeClass, roleLabel } from '../../../lib/roleLabel';
import { UserForm } from '../UserForm';
import {
  ConfirmDialog,
  EmptyState,
  Modal,
  Pagination,
} from '../shared/AdminDialogs';
import { formatDate } from '@/shared/lib/format';

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
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <input
            type="search"
            placeholder="Buscar por email, nombre o negocio…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {showCreateButton && !isEmpty && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <span className="text-lg leading-none">+</span> Nuevo usuario
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
        <p className="rounded-md border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No hay usuarios que coincidan con «{search}».
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Rol</th>
                  <th className="px-3 py-2">Negocio</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Creado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((u) => (
                  <tr
                    key={u.id}
                    className={u.active ? '' : 'bg-gray-50 text-gray-400'}
                  >
                    <td className="px-3 py-2 font-medium">{u.email}</td>
                    <td className="px-3 py-2">{u.name}</td>
                    <td className="px-3 py-2">
                      <span className={roleBadgeClass(u.role)}>
                        {roleLabel(u.role, { short: true })}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {u.business?.name ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 text-xs ${
                          u.active ? 'text-green-700' : 'text-gray-500'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            u.active ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setEditing(u)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Editar
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => setDeleting(u)}
                          disabled={pending}
                          className="ml-3 text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          Borrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
          title={`Editar ${editing.email}`}
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
        <Modal title="Nuevo usuario" onClose={() => setCreating(false)}>
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
              <strong>{deleting.email}</strong>? Esta acción no se puede deshacer.
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
