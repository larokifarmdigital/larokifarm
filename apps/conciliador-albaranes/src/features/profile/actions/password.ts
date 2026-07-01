'use server';

import bcrypt from 'bcryptjs';
import { auth } from '@/core/auth';
import { getUserRepository } from '@/core/users';

export interface ChangePasswordState {
  ok?: boolean;
  error?: string;
}

export async function changeOwnPasswordAction(
  _prev: ChangePasswordState,
  form: FormData,
): Promise<ChangePasswordState> {
  try {
    const session = await auth();
    if (!session?.user) return { error: 'No autenticado.' };

    const currentPassword = String(form.get('currentPassword') ?? '');
    const newPassword = String(form.get('newPassword') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { error: 'Todos los campos son obligatorios.' };
    }
    if (newPassword !== confirmPassword) {
      return { error: 'La nueva contraseña y la confirmación no coinciden.' };
    }
    if (newPassword.length < 8) {
      return { error: 'La nueva contraseña debe tener al menos 8 caracteres.' };
    }
    if (newPassword === currentPassword) {
      return { error: 'La nueva contraseña debe ser distinta a la actual.' };
    }

    const repo = getUserRepository();
    const forAuth = await repo.findByEmailForAuth(session.user.email);
    if (!forAuth || !forAuth.active) {
      return { error: 'Usuario no encontrado o inactivo.' };
    }

    const ok = await bcrypt.compare(currentPassword, forAuth.passwordHash);
    if (!ok) {
      return { error: 'La contraseña actual no es correcta.' };
    }

    await repo.update(
      { kind: 'all' },
      session.user.id,
      { password: newPassword },
    );

    return { ok: true };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Error desconocido',
    };
  }
}
