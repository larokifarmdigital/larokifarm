'use server';

import { getCurrentUser, unstable_update } from '@/core/auth';
import type { SaveResult } from '@/core/shared';
import { UserAccountsService, getUserAccountRepository } from '@/core/users';

/** "Cambiar mi contraseña" (menú del avatar): cualquier rol, solo su propia cuenta. */
export async function cambiarMiContrasenaAction(datos: {
  actual: string;
  nueva: string;
  repetir: string;
}): Promise<SaveResult<{ reentrar: boolean }>> {
  const u = await getCurrentUser();
  const res = await new UserAccountsService(getUserAccountRepository()).cambiarMiContrasena(
    u ? { id: u.id, rol: u.rol } : null,
    datos ?? {},
  );
  // Frena los intentos repetidos de adivinar la actual.
  if (!res.ok && res.fieldErrors?.actual) await new Promise((r) => setTimeout(r, 800));
  if (!res.ok) return res;
  // La huella de la contraseña cambió: esta sesión adopta la nueva y las demás
  // sesiones abiertas de la cuenta se cierran en su siguiente revalidación.
  try {
    await unstable_update({});
    return { ok: true, data: { reentrar: false } };
  } catch {
    // Sin refrescar, esta sesión también caerá: avisamos para volver a entrar.
    return { ok: true, data: { reentrar: true } };
  }
}
