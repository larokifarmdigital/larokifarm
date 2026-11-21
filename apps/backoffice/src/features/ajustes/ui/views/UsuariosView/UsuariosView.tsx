import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/core/auth';
import { UserAccountsService, getUserAccountRepository } from '@/core/users';
import { UsuariosGestion } from '../../components/UsuariosGestion';

/** Ajustes → Usuarios. Solo SUPER_ADMIN (el resto vuelve a Inicio). */
export async function UsuariosView() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const datos = await new UserAccountsService(getUserAccountRepository()).listar({ id: user.id, rol: user.rol });
  if (!datos) redirect('/inicio');
  return <UsuariosGestion cuentas={datos.cuentas} farmacias={datos.farmacias} miId={user.id} />;
}
