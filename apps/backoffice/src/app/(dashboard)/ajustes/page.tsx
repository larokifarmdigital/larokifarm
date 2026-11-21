import { redirect } from 'next/navigation';
import { requireUser } from '@/core/auth';

/** Ajustes solo tiene "Usuarios" por ahora (y solo para el administrador). */
export default async function AjustesPage() {
  const user = await requireUser();
  redirect(user.rol === 'admin' ? '/ajustes/usuarios' : '/inicio');
}
