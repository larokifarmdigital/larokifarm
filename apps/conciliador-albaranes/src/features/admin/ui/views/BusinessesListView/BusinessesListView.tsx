/**
 * Vista de /admin/negocios.
 *
 * SUPER_ADMIN ve y gestiona todos los negocios (crear, editar, borrar, BYOK).
 * BUSINESS_ADMIN ve solo el suyo y puede editar nombre + BYOK (no crear/borrar).
 * USER → redirige a /.
 */
import { redirect } from 'next/navigation';
import { auth } from '@/core/auth';
import { ListBusinessesUseCase, getBusinessRepository } from '@/core/businesses';
import { BusinessesTable } from '../../components/BusinessesTable';

export async function BusinessesListView() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'USER') redirect('/');

  const businessRepo = getBusinessRepository();
  const listBusinesses = new ListBusinessesUseCase(businessRepo);
  const negocios = await listBusinesses.execute(session);

  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Negocios</h1>
        <p className="text-xs text-gray-500">
          {negocios.length} {negocios.length === 1 ? 'negocio' : 'negocios'}
        </p>
      </div>

      <BusinessesTable businesses={negocios} canDelete={isSuperAdmin} />
    </main>
  );
}
