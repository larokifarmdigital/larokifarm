import { auth } from '@/core/auth';
import type { Role } from '@/core/shared';
import { HeaderClient, type NavItem } from './HeaderClient';

export async function Header() {
  const session = await auth();
  if (!session?.user) return null;

  const isAdmin =
    session.user.role === 'SUPER_ADMIN' || session.user.role === 'BUSINESS_ADMIN';
  const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

  const navItems: NavItem[] = [
    { href: '/', label: 'Conciliar' },
    { href: '/historial', label: 'Historial' },
    ...(isAdmin
      ? ([
          { href: '/admin/usuarios', label: 'Usuarios' },
          {
            href: '/admin/negocios',
            label: isSuperAdmin ? 'Negocios' : 'Mi negocio',
          },
          { href: '/admin/uso', label: 'Uso' },
        ] as NavItem[])
      : []),
  ];

  return (
    <HeaderClient
      user={{
        name: session.user.name ?? session.user.email ?? 'Usuario',
        email: session.user.email ?? '',
        role: session.user.role as Role,
      }}
      navItems={navItems}
    />
  );
}
