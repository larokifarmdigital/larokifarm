'use client';

import { useActionState, useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { BusinessRow } from '@/core/businesses';
import {
  deleteBusinessAction,
  setGeminiApiKeyAction,
  updateBusinessAction,
  type BusinessActionState,
} from '../../../actions/businesses';
import { BusinessForm } from '../BusinessForm';
import {
  ConfirmDialog,
  EmptyState,
  Modal,
  Pagination,
} from '../shared/AdminDialogs';
import { formatDate } from '@/shared/lib/format';

const initialState: BusinessActionState = {};

interface BusinessesTableProps {
  businesses: BusinessRow[];
  /** Solo SUPER_ADMIN puede borrar/crear negocios. */
  canDelete: boolean;
}

export function BusinessesTable({ businesses, canDelete }: BusinessesTableProps) {
  const [editingApiKey, setEditingApiKey] = useState<BusinessRow | null>(null);
  const [editingName, setEditingName] = useState<BusinessRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BusinessRow | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter(
      (b) =>
        b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q),
    );
  }, [businesses, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function confirmDelete() {
    if (!deleting) return;
    const b = deleting;
    startTransition(async () => {
      const r = await deleteBusinessAction(b.id);
      if (r.error) {
        toast.error(r.error);
      } else {
        toast.success(`Negocio "${b.name}" eliminado`);
      }
      setDeleting(null);
    });
  }

  const isEmpty = businesses.length === 0;
  const isEmptyFiltered = !isEmpty && filtered.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[220px] flex-1">
          <input
            type="search"
            placeholder="Buscar por nombre o slug…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {canDelete && !isEmpty && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <span className="text-lg leading-none">+</span> Nuevo negocio
          </button>
        )}
      </div>

      {isEmpty ? (
        <EmptyState
          title="Aún no hay negocios"
          description={
            canDelete
              ? 'Crea el primer negocio para empezar.'
              : 'No tienes ningún negocio asignado.'
          }
          ctaLabel={canDelete ? 'Crear primer negocio' : undefined}
          onCta={() => setCreating(true)}
        />
      ) : isEmptyFiltered ? (
        <p className="rounded-md border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No hay negocios que coincidan con «{search}».
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">API key Gemini</th>
                  <th className="px-3 py-2">Creado</th>
                  <th className="px-3 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((b) => (
                  <tr key={b.id}>
                    <td className="px-3 py-2 font-mono text-xs">{b.slug}</td>
                    <td className="px-3 py-2 font-medium">{b.name}</td>
                    <td className="px-3 py-2">
                      {b.hasGeminiKey ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          BYOK configurada
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">
                          Fallback global
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {formatDate(b.createdAt)}
                    </td>
                    <td className="px-3 py-2 text-right">
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
                          onClick={() => setDeleting(b)}
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

      {editingName && (
        <Modal
          title={`Editar ${editingName.name}`}
          onClose={() => setEditingName(null)}
        >
          <NameForm
            business={editingName}
            onSuccess={() => setEditingName(null)}
          />
        </Modal>
      )}

      {editingApiKey && (
        <Modal
          title={`API key Gemini — ${editingApiKey.name}`}
          onClose={() => setEditingApiKey(null)}
          size="lg"
        >
          <ApiKeyForm
            business={editingApiKey}
            onSuccess={() => setEditingApiKey(null)}
          />
        </Modal>
      )}

      {creating && (
        <Modal title="Nuevo negocio" onClose={() => setCreating(false)}>
          <BusinessForm onSuccess={() => setCreating(false)} />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar negocio"
          description={
            <>
              ¿Seguro que quieres eliminar el negocio{' '}
              <strong>«{deleting.name}»</strong>?
              <br />
              <span className="text-red-600">
                Borrará también todas sus conciliaciones y archivos asociados
                (CASCADE).
              </span>
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

function NameForm({
  business,
  onSuccess,
}: {
  business: BusinessRow;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateBusinessAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      toast.success('Negocio actualizado');
      onSuccess?.();
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4 text-sm">
      <input type="hidden" name="id" value={business.id} />
      <label className="block">
        <span className="block text-xs font-medium uppercase tracking-wider text-gray-500">
          Nombre
        </span>
        <input
          name="name"
          required
          defaultValue={business.name}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {pending && (
          <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden
          />
        )}
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}

function ApiKeyForm({
  business,
  onSuccess,
}: {
  business: BusinessRow;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    setGeminiApiKeyAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      toast.success('API key actualizada');
      onSuccess?.();
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-4 text-sm">
      <input type="hidden" name="id" value={business.id} />

      <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-900">
        {business.hasGeminiKey
          ? 'Hay una API key BYOK configurada. Si dejas el campo vacío y guardas, se limpiará y el negocio volverá a usar la key global.'
          : 'Sin API key BYOK. El negocio usa la GEMINI_API_KEY global. Introduce una key para usar una propia.'}
      </p>

      <label className="block">
        <span className="block text-xs font-medium uppercase tracking-wider text-gray-500">
          API key Gemini (BYOK)
        </span>
        <input
          name="apiKey"
          type="password"
          placeholder={business.hasGeminiKey ? '••••••••' : 'AIza...'}
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 font-mono"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
      >
        {pending && (
          <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden
          />
        )}
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}
