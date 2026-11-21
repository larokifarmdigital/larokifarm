'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/core/auth';
import type { SaveResult } from '@/core/shared';
import {
  UserAccountsService,
  getUserAccountRepository,
  type ActorCuenta,
  type CuentaConContrasena,
  type UserAccount,
} from '@/core/users';

async function actor(): Promise<ActorCuenta | null> {
  const u = await getCurrentUser();
  return u ? { id: u.id, rol: u.rol } : null;
}

const servicio = () => new UserAccountsService(getUserAccountRepository());
const RUTA = '/ajustes/usuarios';

function fin<T>(res: SaveResult<T>): SaveResult<T> {
  if (res.ok) revalidatePath(RUTA);
  return res;
}

export async function crearUsuarioAction(datos: {
  nombre: string;
  email: string;
  rol: string;
  farmaciaId: string | null;
}): Promise<SaveResult<CuentaConContrasena>> {
  return fin(await servicio().crear(await actor(), datos));
}

export async function editarUsuarioAction(
  id: string,
  datos: { nombre: string; rol: string; farmaciaId: string | null },
): Promise<SaveResult<UserAccount>> {
  if (typeof id !== 'string') return { ok: false, error: 'Petición no válida.' };
  return fin(await servicio().editar(await actor(), id, datos));
}

export async function cambiarActivoUsuarioAction(id: string, activo: boolean): Promise<SaveResult<UserAccount>> {
  if (typeof id !== 'string') return { ok: false, error: 'Petición no válida.' };
  return fin(await servicio().cambiarActivo(await actor(), id, activo));
}

export async function restablecerContrasenaAction(id: string): Promise<SaveResult<CuentaConContrasena>> {
  if (typeof id !== 'string') return { ok: false, error: 'Petición no válida.' };
  return fin(await servicio().restablecerContrasena(await actor(), id));
}
