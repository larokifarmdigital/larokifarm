'use server';

import { AuthError, CredentialsSignin } from 'next-auth';
import { redirect, unstable_rethrow } from 'next/navigation';
import { z } from 'zod';
import { signIn, signOut } from '@/core/auth';

const loginSchema = z.object({
  email: z.string().min(1, 'Escribe tu correo').email('Ese correo no parece válido. Ejemplo: nombre@farmacia.com'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});

/**
 * Por qué no se ha podido entrar. Cada motivo tiene su mensaje en LoginForm:
 * - campos: falta algo o el correo no tiene formato (errores bajo cada campo).
 * - credenciales: correo o contraseña no coinciden (sin decir cuál, a propósito).
 * - desactivada: contraseña correcta pero la cuenta está desactivada.
 * - servidor: fallo inesperado; se puede reintentar.
 */
export type MotivoErrorLogin = 'campos' | 'credenciales' | 'desactivada' | 'servidor';

export type LoginState =
  | { status: 'idle' }
  | {
      status: 'error';
      motivo: MotivoErrorLogin;
      /** Se devuelve para no obligar a escribirlo otra vez. */
      email: string;
      fieldErrors?: Record<string, string>;
    }
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
      // El primer problema de cada campo es el que importa (vacío antes que formato).
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: 'error', motivo: 'campos', email: raw.email, fieldErrors };
  }

  try {
    await signIn('credentials', {
      recordar: formData.get('recordar') === '1' ? '1' : '',
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeReturnTo(formData.get('returnTo')),
    });
  } catch (err) {
    // NOTE: next-auth v5 lanza NEXT_REDIRECT internamente al redirigir tras
    // login OK — hay que dejarlo propagar.
    unstable_rethrow(err);

    if (err instanceof AuthError) {
      if (err instanceof CredentialsSignin || err.type === 'CredentialsSignin') {
        const desactivada = (err as CredentialsSignin).code === 'cuenta_desactivada';
        return { status: 'error', motivo: desactivada ? 'desactivada' : 'credenciales', email: raw.email };
      }
      console.error('[login] error de autenticación', err.type);
      return { status: 'error', motivo: 'servidor', email: raw.email };
    }
    // BD caída u otro fallo: mensaje claro en vez de la pantalla de error.
    console.error('[login] error inesperado', (err as Error)?.name);
    return { status: 'error', motivo: 'servidor', email: raw.email };
  }

  // No debería llegar aquí (signIn redirige), pero por seguridad:
  return { status: 'success' };
}

/**
 * Solo rutas internas: de `http://host/farmacias/x?y` se queda con
 * `/farmacias/x?y`. Nada de `//evil.com` ni otros dominios (open redirect).
 */
function safeReturnTo(raw: FormDataEntryValue | null): string {
  if (typeof raw !== 'string' || !raw) return '/inicio';
  try {
    const u = new URL(raw, 'http://local.invalid');
    const path = u.pathname + u.search;
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) return '/inicio';
    return path;
  } catch {
    return '/inicio';
  }
}

export async function logoutAction() {
  // NOTE: redirect:false → signOut solo limpia la sesión (no intenta
  // redirigir por su cuenta, que dentro de una server action se comporta
  // erráticamente en next-auth v5 beta). El redirect lo hacemos nosotros.
  await signOut({ redirect: false });
  redirect('/login');
}
