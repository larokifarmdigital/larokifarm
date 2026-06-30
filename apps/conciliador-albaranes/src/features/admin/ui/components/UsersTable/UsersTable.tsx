'use client';

import { useState, useTransition } from 'react';
import type { Role } from '@/core/shared';
import type { UserRow } from '@/core/users';
import type { BusinessRow } from '@/core/businesses';
import { deleteUserAction } from '../../../actions/users';
import { UserForm } from '../UserForm';
import { formatDate } from '@/shared/lib/format';

interface UsersTableProps {
  users: UserRow[];
  rolesDisponibles: Role[];
  negocios: BusinessRow[];
  fijarBusiness: boolean;
  currentUserId: string;
}

export function UsersTable({
  users,
  rolesDisponibles,
  negocios,
  fijarBusiness,
  currentUserId,
}: UsersTableProps) {
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete(u: UserRow) {
    if (!confirm(`¿Eliminar a ${u.email}? Esta acción no se puede deshacer.`)) return;
    setDeleteError(null);
    startTransition(async () => {
      const r = await deleteUserAction(u.id);
      if (r.error) setDeleteError(r.error);
    });
  }

  if (users.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        Aún no hay usuarios.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {deleteError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {deleteError}
        </p>
      )}
      <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Negocio</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Creado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className={u.active ? '' : 'bg-gray-50 text-gray-400'}>
                <td className="px-3 py-2 font-medium">{u.email}</td>
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2 text-xs">{u.role}</td>
                <td className="px-3 py-2">{u.business?.name ?? '—'}</td>
                <td className="px-3 py-2">{u.active ? 'Activo' : 'Inactivo'}</td>
                <td className="px-3 py-2">{formatDate(u.createdAt)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => setEditing(u)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Editar
                  </button>
                  {u.id !== currentUserId && (
                    <button
                      onClick={() => handleDelete(u)}
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

      {editing && (
        <Modal title={`Editar ${editing.email}`} onClose={() => setEditing(null)}>
          <UserForm
            user={editing}
            rolesDisponibles={rolesDisponibles}
            negocios={negocios}
            fijarBusiness={fijarBusiness}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
