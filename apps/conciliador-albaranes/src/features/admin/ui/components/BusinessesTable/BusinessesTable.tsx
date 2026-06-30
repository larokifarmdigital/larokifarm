'use client';

import { useActionState, useState, useTransition } from 'react';
import type { BusinessRow } from '@/core/businesses';
import {
  deleteBusinessAction,
  setGeminiApiKeyAction,
  updateBusinessAction,
  type BusinessActionState,
} from '../../../actions/businesses';
import { formatDate } from '@/shared/lib/format';

const initialState: BusinessActionState = {};

interface BusinessesTableProps {
  businesses: BusinessRow[];
  /** Solo SUPER_ADMIN puede borrar negocios. */
  canDelete: boolean;
}

export function BusinessesTable({ businesses, canDelete }: BusinessesTableProps) {
  const [editingApiKey, setEditingApiKey] = useState<BusinessRow | null>(null);
  const [editingName, setEditingName] = useState<BusinessRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete(b: BusinessRow) {
    if (
      !confirm(
        `¿Eliminar el negocio "${b.name}"? Borrará todas sus comparaciones y archivos asociados (CASCADE).`,
      )
    )
      return;
    setDeleteError(null);
    startTransition(async () => {
      const r = await deleteBusinessAction(b.id);
      if (r.error) setDeleteError(r.error);
    });
  }

  if (businesses.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
        Aún no hay negocios.
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
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">API key Gemini</th>
              <th className="px-3 py-2">Creado</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {businesses.map((b) => (
              <tr key={b.id}>
                <td className="px-3 py-2 font-mono text-xs">{b.slug}</td>
                <td className="px-3 py-2">{b.name}</td>
                <td className="px-3 py-2">
                  {b.hasGeminiKey ? (
                    <span className="text-green-700">Configurada (BYOK)</span>
                  ) : (
                    <span className="text-gray-500">— Fallback global —</span>
                  )}
                </td>
                <td className="px-3 py-2">{formatDate(b.createdAt)}</td>
                <td className="px-3 py-2 text-right text-sm">
                  <button
                    onClick={() => setEditingName(b)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setEditingApiKey(b)}
                    className="ml-3 text-blue-600 hover:text-blue-800"
                  >
                    API key
                  </button>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(b)}
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

      {editingName && (
        <Modal title={`Editar ${editingName.name}`} onClose={() => setEditingName(null)}>
          <NameForm business={editingName} />
        </Modal>
      )}
      {editingApiKey && (
        <Modal
          title={`API key Gemini — ${editingApiKey.name}`}
          onClose={() => setEditingApiKey(null)}
        >
          <ApiKeyForm business={editingApiKey} />
        </Modal>
      )}
    </div>
  );
}

function NameForm({ business }: { business: BusinessRow }) {
  const [state, formAction, pending] = useActionState(updateBusinessAction, initialState);
  return (
    <form action={formAction} className="space-y-3 text-sm">
      <input type="hidden" name="id" value={business.id} />
      <label className="block">
        <span className="block text-xs uppercase tracking-wider text-gray-500">
          Nombre
        </span>
        <input
          name="name"
          required
          defaultValue={business.name}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-green-700">Guardado.</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {pending ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  );
}

function ApiKeyForm({ business }: { business: BusinessRow }) {
  const [state, formAction, pending] = useActionState(setGeminiApiKeyAction, initialState);
  return (
    <form action={formAction} className="space-y-3 text-sm">
      <input type="hidden" name="id" value={business.id} />

      <p className="text-xs text-gray-500">
        {business.hasGeminiKey
          ? 'Hay una API key BYOK configurada. Si dejas el campo vacío y guardas, se limpiará y volverá a usar la key global.'
          : 'Sin API key BYOK. El negocio usa la GEMINI_API_KEY global.'}
      </p>

      <label className="block">
        <span className="block text-xs uppercase tracking-wider text-gray-500">
          API key Gemini (BYOK)
        </span>
        <input
          name="apiKey"
          type="password"
          placeholder={business.hasGeminiKey ? '••••••••' : 'sk-...'}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-green-700">
          Guardado.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
      >
        {pending ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
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
