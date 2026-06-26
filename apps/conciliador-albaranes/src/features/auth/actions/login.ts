'use server';

import { AuthError } from 'next-auth';
import { LoginUseCase } from '../core/application';

export type LoginState = {
  error?: string;
};

const useCase = new LoginUseCase();

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Email y contraseña son obligatorios.' };
  }

  try {
    await useCase.execute({ email, password, redirectTo: '/' });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.type === 'CredentialsSignin') {
        return { error: 'Email o contraseña incorrectos.' };
      }
      return { error: 'No se pudo iniciar sesión.' };
    }
    // Next.js usa errores especiales para redirigir desde server actions; re-lanzar.
    throw err;
  }
}
