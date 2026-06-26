/**
 * Vista de /admin/usuarios.
 *
 * Server Component: obtiene sesión, llama a los use cases con scoping RBAC,
 * y renderiza tabla + form de creación. La page solo importa esta view.
 */
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth';
import {
  getBusinessRepository,
  getUserRepository,
  type Role,
} from '@/shared/core';
import {
  ListBusinessesUseCase,
  ListUsersUseCase,
} from '../../../core';
import { UserForm } from '../../components/UserForm';
import { UsersTable } from '../../components/UsersTable';

export async function UsuariosListView() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role === 'USER') redirect('/');

  const userRepo = getUserRepository();
  const businessRepo = getBusinessRepository();
  const listUsers = new ListUsersUseCase(userRepo);
  const listBusinesses = new ListBusinessesUseCase(businessRepo);

  const [users, negocios] = await Promise.all([
    listUsers.execute(session),
    listBusinesses.execute(session),
  ]);

  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
  const rolesDisponibles: Role[] = isSuperAdmin
    ? ['SUPER_ADMIN', 'BUSINESS_ADMIN', 'USER']
    : ['BUSINESS_ADMIN', 'USER'];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Usuarios</h1>

      <section className="mb-8 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Crear usuario
        </h2>
        <UserForm
          rolesDisponibles={rolesDisponibles}
          negocios={negocios}
          fijarBusiness={!isSuperAdmin}
        />
      </section>

      <UsersTable
        users={users}
        rolesDisponibles={rolesDisponibles}
        negocios={negocios}
        fijarBusiness={!isSuperAdmin}
        currentUserId={session.user.id}
      />
    </main>
  );
}
