import { redirect } from 'next/navigation';
import { auth } from '@/core/auth';
import { roleLabel } from '@/features/admin/lib/roleLabel';
import { ChangePasswordForm } from '../../components/ChangePasswordForm';

/**
 * Vista de /perfil.
 *
 * Muestra los datos básicos de la cuenta y un formulario para cambiar
 * la contraseña. Disponible para cualquier usuario autenticado.
 */
export async function ProfileView() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-xl font-semibold text-gray-900">Mi perfil</h1>

      <section className="mb-8 rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Datos de la cuenta
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-gray-500">
              Nombre
            </dt>
            <dd className="text-gray-900">{session.user.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-gray-500">
              Email
            </dt>
            <dd className="text-gray-900">{session.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-gray-500">
              Rol
            </dt>
            <dd className="text-gray-900">{roleLabel(session.user.role)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-md border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Cambiar contraseña
        </h2>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
