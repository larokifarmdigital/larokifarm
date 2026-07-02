'use client';

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from 'react';
import { toast } from 'sonner';
import type { BusinessRow } from '@/core/businesses';
import { businessColor } from '@/features/history/lib/businessColor';
import { formatDateOnly } from '@/shared/lib/format';
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

const initialState: BusinessActionState = {};

interface BusinessesTableProps {
  businesses: BusinessRow[];
  /** Solo SUPER_ADMIN puede borrar/crear negocios. */
  canDelete: boolean;
}

export function BusinessesTable({
  businesses,
  canDelete,
}: BusinessesTableProps) {
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
            placeholder="Buscar por nombre o slug…"
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
        {canDelete && !isEmpty && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm"
            style={{ background: 'var(--brand-primary)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'var(--brand-primary-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'var(--brand-primary)';
            }}
          >
            <PlusIcon /> Nuevo negocio
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
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No hay negocios que coincidan con «{search}».
        </p>
      ) : (
        <>
          {/* Desktop: tabla */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Slug</th>
                  <th className="px-3 py-2.5">Nombre</th>
                  <th className="px-3 py-2.5">API key Gemini</th>
                  <th className="px-3 py-2.5">Creado</th>
                  <th
                    className="w-28 px-3 py-2.5 text-right"
                    aria-label="Acciones"
                  />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((b) => {
                  const bColor = businessColor(b.slug);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td
                        className="whitespace-nowrap py-2.5 pl-3 pr-3"
                        style={{ boxShadow: `inset 4px 0 0 ${bColor}` }}
                      >
                        <span
                          className="block max-w-[160px] truncate font-mono text-xs text-slate-700"
                          title={b.slug}
                        >
                          {b.slug}
                        </span>
                      </td>
                      <td className="max-w-[220px] px-3 py-2.5">
                        <span
                          className="block truncate font-medium text-slate-900"
                          title={b.name}
                        >
                          {b.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <ApiKeyStatus configured={b.hasGeminiKey} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">
                        {formatDateOnly(b.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <IconAction
                            onClick={() => setEditingName(b)}
                            title="Editar nombre"
                          >
                            <PencilIcon />
                          </IconAction>
                          <IconAction
                            onClick={() => setEditingApiKey(b)}
                            title="Editar API key Gemini"
                          >
                            <KeyIcon />
                          </IconAction>
                          {canDelete && (
                            <IconAction
                              onClick={() => setDeleting(b)}
                              disabled={pending}
                              title="Eliminar negocio"
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
            {paginated.map((b) => {
              const bColor = businessColor(b.slug);
              return (
                <li
                  key={b.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4"
                  style={{ borderLeft: `4px solid ${bColor}` }}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className="truncate font-semibold text-slate-900"
                        title={b.name}
                      >
                        {b.name}
                      </p>
                      <p
                        className="mt-0.5 truncate font-mono text-xs text-slate-500"
                        title={b.slug}
                      >
                        {b.slug}
                      </p>
                    </div>
                    <ApiKeyStatus configured={b.hasGeminiKey} />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-400">
                      Creado {formatDateOnly(b.createdAt)}
                    </span>
                    <div className="flex items-center gap-1">
                      <IconAction
                        onClick={() => setEditingName(b)}
                        title="Editar nombre"
                      >
                        <PencilIcon />
                      </IconAction>
                      <IconAction
                        onClick={() => setEditingApiKey(b)}
                        title="Editar API key"
                      >
                        <KeyIcon />
                      </IconAction>
                      {canDelete && (
                        <IconAction
                          onClick={() => setDeleting(b)}
                          disabled={pending}
                          title="Eliminar negocio"
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

      {editingName && (
        <Modal
          title="Editar negocio"
          description={editingName.slug}
          onClose={() => setEditingName(null)}
        >
          <NameForm
            business={editingName}
            onSuccess={() => setEditingName(null)}
            onCancel={() => setEditingName(null)}
          />
        </Modal>
      )}

      {editingApiKey && (
        <Modal
          title="API key Gemini"
          description={editingApiKey.name}
          onClose={() => setEditingApiKey(null)}
          size="lg"
        >
          <ApiKeyForm
            business={editingApiKey}
            onSuccess={() => setEditingApiKey(null)}
            onCancel={() => setEditingApiKey(null)}
          />
        </Modal>
      )}

      {creating && (
        <Modal
          title="Nuevo negocio"
          description="Crea una nueva farmacia (multi-tenant)."
          onClose={() => setCreating(false)}
        >
          <BusinessForm
            onSuccess={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      )}

      {deleting && (
        <ConfirmDialog
          title="Eliminar negocio"
          description={
            <>
              ¿Seguro que quieres eliminar{' '}
              <strong>«{deleting.name}»</strong>? Se borrarán también{' '}
              <strong>todas sus conciliaciones y archivos asociados</strong>{' '}
              (CASCADE). Esta acción no se puede deshacer.
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

function ApiKeyStatus({ configured }: { configured: boolean }) {
  if (configured) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200">
        BYOK configurada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
      Fallback global
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

/* ---------------------------- Form: nombre ------------------------------- */

function NameForm({
  business,
  onSuccess,
  onCancel,
}: {
  business: BusinessRow;
  onSuccess?: () => void;
  onCancel?: () => void;
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

      <FormField label="Slug" hint="No editable">
        <input
          type="text"
          value={business.slug}
          disabled
          className={`${inputClass} font-mono`}
          style={inputStyle}
        />
      </FormField>

      <FormField label="Nombre visible">
        <input
          name="name"
          required
          defaultValue={business.name}
          className={inputClass}
          style={inputStyle}
        />
      </FormField>

      <FormFooter
        pending={pending}
        onCancel={onCancel}
        submitLabel="Guardar cambios"
      />
    </form>
  );
}

/* --------------------------- Form: API key -------------------------------- */

function ApiKeyForm({
  business,
  onSuccess,
  onCancel,
}: {
  business: BusinessRow;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    setGeminiApiKeyAction,
    initialState,
  );
  const [showKey, setShowKey] = useState(false);

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

      <div
        className="rounded-lg px-3 py-2.5 text-xs"
        style={{
          background: 'var(--brand-primary-soft)',
          color: 'var(--brand-accent)',
        }}
      >
        {business.hasGeminiKey ? (
          <>
            Hay una <strong>API key BYOK</strong> configurada. Si dejas el campo
            vacío y guardas, se limpiará y el negocio volverá a usar la key
            global.
          </>
        ) : (
          <>
            Sin API key BYOK. El negocio usa la <strong>GEMINI_API_KEY</strong>{' '}
            global. Introduce una key para que este negocio use la suya propia.
          </>
        )}
      </div>

      <FormField label="API key Gemini (BYOK)">
        <div className="relative">
          <input
            name="apiKey"
            type={showKey ? 'text' : 'password'}
            placeholder={business.hasGeminiKey ? '••••••••' : 'AIza…'}
            className={`${inputClass} pr-10 font-mono`}
            style={inputStyle}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            tabIndex={-1}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={showKey ? 'Ocultar API key' : 'Mostrar API key'}
          >
            {showKey ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </FormField>

      <FormFooter
        pending={pending}
        onCancel={onCancel}
        submitLabel="Guardar cambios"
      />
    </form>
  );
}

/* ------------------------- Compartido de formularios --------------------- */

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {label}
        </label>
        {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function FormFooter({
  pending,
  onCancel,
  submitLabel,
}: {
  pending: boolean;
  onCancel?: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancelar
        </button>
      )}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-70"
        style={{ background: 'var(--brand-primary)' }}
        onMouseEnter={(e) => {
          if (!pending)
            (e.currentTarget as HTMLButtonElement).style.background =
              'var(--brand-primary-hover)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            'var(--brand-primary)';
        }}
      >
        {pending && (
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
            aria-hidden
          />
        )}
        {pending ? 'Guardando…' : submitLabel}
      </button>
    </div>
  );
}

const inputClass =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

const inputStyle = {
  ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
} as React.CSSProperties;

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

function KeyIcon() {
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
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
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

function EyeIcon() {
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
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
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
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}
