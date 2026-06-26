import Link from 'next/link';
import { auth, logoutAction } from '@/features/auth';

/**
 * Cabecera común para páginas autenticadas.
 *
 * Server Component: lee la sesión en render y oculta el header si no hay sesión
 * (para que la /login no muestre nav). Añade links de admin si el rol los
 * permite.
 */
export async function Header() {
  const session = await auth();
  if (!session?.user) return null;

  const isAdmin =
    session.user.role === 'SUPER_ADMIN' || session.user.role === 'BUSINESS_ADMIN';
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-base font-semibold text-gray-900">
            Conciliador
          </Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            Conciliar
          </Link>
          <Link
            href="/historial"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Historial
          </Link>
          {isAdmin && (
            <Link
              href="/admin/usuarios"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Usuarios
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/negocios"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              {isSuperAdmin ? 'Negocios' : 'Mi negocio'}
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/uso"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Uso
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {session.user.name}{' '}
            <span className="text-xs text-gray-400">({session.user.role})</span>
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
