import { cookies } from 'next/headers';
import type { Usuario } from '@/types/content';
import { MOCK_USUARIOS } from '@/mocks/users';

export const SESSION_COOKIE = 'larokifarm_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export function encodeSession(userId: string): string {
  return Buffer.from(JSON.stringify({ userId, issuedAt: Date.now() })).toString('base64url');
}

export function decodeSession(token: string): { userId: string; issuedAt: number } | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed?.userId !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<Usuario | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = decodeSession(token);
  if (!session) return null;
  return MOCK_USUARIOS.find((u) => u.id === session.userId) ?? null;
}

export async function requireUser(): Promise<Usuario> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Sesión requerida');
  return user;
}
