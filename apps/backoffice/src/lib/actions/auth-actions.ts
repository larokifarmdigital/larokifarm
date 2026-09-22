'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { MOCK_PASSWORDS, MOCK_USUARIOS } from '@/mocks/users';
import { SESSION_COOKIE, SESSION_MAX_AGE, encodeSession } from '@/lib/session';
import { sleep } from '@/lib/utils';

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

  await sleep(600);

  const user = MOCK_USUARIOS.find((u) => u.email.toLowerCase() === parsed.data.email);
  if (!user || MOCK_PASSWORDS[user.email] !== parsed.data.password) {
    return {
      status: 'error',
      message: 'Correo o contraseña incorrectos',
    };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(user.id), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });

  redirect('/farmacias');
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/login');
}
