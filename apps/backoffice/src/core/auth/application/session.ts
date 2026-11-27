import type { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { auth } from '../infrastructure/authjs';
import { puedeUsarModulo } from '../infrastructure/farmacias';
import type { Usuario } from '@/core/auth/domain';
import { farmaciasDeSesion, modulosDeDb, type Modulo } from '@/core/shared';

// Adapter fino next-auth → Usuario (tipo local de la UI).
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
    farmaciaIds: farmaciasDeSesion(session),
    modulos: modulosDeDb(session.user.modules),
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

/**
 * Páginas de un módulo: sin el módulo activado (leído de la BD) → /inicio.
 * Va en cada page, no en el layout: el layout no se vuelve a ejecutar al
 * navegar entre páginas del mismo módulo.
 */
export async function requireModulo(modulo: Modulo): Promise<Usuario> {
  const user = await requireUser();
  if (!(await puedeUsarModulo(user.id, modulo))) redirect('/inicio');
  return user;
}
