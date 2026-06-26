/**
 * Vista de /admin/negocios.
 *
 * SUPER_ADMIN ve y gestiona todos los negocios (crear, editar, borrar, BYOK).
 * BUSINESS_ADMIN ve solo el suyo y puede editar nombre + BYOK (no borrar).
 * USER → redirige a /.
 */
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth';
import { getBusinessRepository } from '@/shared/core';
import { ListBusinessesUseCase } from '../../../core';
import { BusinessForm } from '../../components/BusinessForm';
import { BusinessesTable } from '../../components/BusinessesTable';

export async function NegociosListView() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'USER') redirect('/');

  const businessRepo = getBusinessRepository();
  const listBusinesses = new ListBusinessesUseCase(businessRepo);
  const negocios = await listBusinesses.execute(session);

  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Negocios</h1>

      {isSuperAdmin && (
        <section className="mb-8 rounded-md border border-gray-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Crear negocio
          </h2>
          <BusinessForm />
        </section>
      )}

      <BusinessesTable businesses={negocios} canDelete={isSuperAdmin} />
    </main>
  );
}
