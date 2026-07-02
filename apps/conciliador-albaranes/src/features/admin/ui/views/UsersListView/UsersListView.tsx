import { redirect } from 'next/navigation';
import { auth } from '@/core/auth';
import type { Role } from '@/core/shared';
import { ListUsersUseCase, getUserRepository } from '@/core/users';
import { ListBusinessesUseCase, getBusinessRepository } from '@/core/businesses';
import { UsersTable } from '../../components/UsersTable';

export async function UsersListView() {
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
    : ['USER'];

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Usuarios</h1>
        <p className="text-xs text-gray-500">
          {users.length} {users.length === 1 ? 'usuario' : 'usuarios'}
        </p>
      </div>

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
