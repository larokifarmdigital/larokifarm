// Muestra una captura de incidencia. Solo la cuenta de administración (llega
// por el enlace del correo de aviso); sin sesión, se pide entrar y se vuelve aquí.
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/core/auth';
import { getStorage } from '@/core/storage';

export const runtime = 'nodejs';

const KEY = /^incidencias\/(precios|albaranes)\/\d{4}\/\d{2}\/[a-z0-9]{20,32}\.webp$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const session = await auth();
  if (!session?.user) {
    const login = new URL('/login', req.url);
    login.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(login);
  }
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Solo la cuenta de administración.' }, { status: 403 });

  const key = (await params).key.join('/');
  if (!KEY.test(key)) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  let archivo: { data: Buffer; contentType: string };
  try {
    archivo = await getStorage().read(key);
  } catch {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(archivo.data), {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Disposition': 'inline',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
}
