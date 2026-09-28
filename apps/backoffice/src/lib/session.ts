import type { Role } from '@prisma/client';
import { auth } from '@/lib/auth';
import type { Usuario } from '@/types/content';

// NOTE: adapter fino next-auth → Usuario (el tipo local de la UI). Así los
// componentes que ya consumen `Usuario` no se tocan.
function mapRole(role: Role): Usuario['rol'] {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'admin';
    case 'BUSINESS_ADMIN':
      return 'manager';
    case 'USER':
      return 'viewer';
  }
}

export async function getCurrentUser(): Promise<Usuario | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    nombre: session.user.name,
    rol: mapRole(session.user.role),
    farmaciaId: session.user.businessId ?? undefined,
    // NOTE: no lo trae la sesión, se aproxima. Si algún consumer lo necesita
    // preciso, se hace un findUnique aparte por id.
    createdAt: new Date().toISOString(),
  };
}

export async function requireUser(): Promise<Usuario> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Sesión requerida');
  return user;
}
