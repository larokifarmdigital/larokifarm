'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { signIn, signOut } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('Introduce un correo válido'),
  password: z.string().min(1, 'La contraseña no puede estar vacía'),
});

export type LoginState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string> }
  | { status: 'success' };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const raw = {
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString();
      if (key) fieldErrors[key] = issue.message;
    }
    return { status: 'error', message: 'Revisa los campos marcados', fieldErrors };
  }

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/farmacias',
    });
  } catch (err) {
    // NOTE: next-auth v5 lanza NEXT_REDIRECT internamente al redirigir tras
    // login OK — hay que dejarlo propagar.
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err;

    if (err instanceof AuthError) {
      if (err.type === 'CredentialsSignin') {
        return { status: 'error', message: 'Correo o contraseña incorrectos' };
      }
      return { status: 'error', message: 'No se pudo iniciar sesión. Vuelve a intentarlo.' };
    }
    throw err;
  }

  // No debería llegar aquí (signIn redirige), pero por seguridad:
  return { status: 'success' };
}

export async function logoutAction() {
  // NOTE: redirect:false → signOut solo limpia la sesión (no intenta
  // redirigir por su cuenta, que dentro de una server action se comporta
  // erráticamente en next-auth v5 beta). El redirect lo hacemos nosotros.
  await signOut({ redirect: false });
  redirect('/login');
}
