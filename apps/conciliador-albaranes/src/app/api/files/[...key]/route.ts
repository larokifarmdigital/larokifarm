/**
 * Sirve archivos del storage local.
 *
 * Doble capa de control de acceso:
 *  1. Sesión válida (Auth.js).
 *  2. Token firmado en la query (`?token=…`) emitido por `storage.getDownloadUrl()`.
 *     El token enlaza un `key` concreto y caduca en minutos, así que aunque
 *     se filtre no concede acceso indefinido.
 *
 * Scoping por negocio: el primer segmento del `key` es el `businessSlug`. Si la
 * sesión no es SUPER_ADMIN, se exige que ese slug coincida con el negocio del
 * usuario. SUPER_ADMIN puede acceder a cualquier business.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/core/auth';
import { prisma } from '@/shared/lib/prisma';
import { getStorage, verifyDownloadToken } from '@/core/storage';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { key: keyParts } = await params;
  const key = keyParts.join('/');

  // Scoping por negocio: primer segmento = slug
  const [businessSlug] = keyParts;
  if (session.user.role !== 'SUPER_ADMIN') {
    if (!session.user.businessId) {
      return NextResponse.json({ error: 'Sin negocio asignado' }, { status: 403 });
    }
    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: { slug: true },
    });
    if (!business || business.slug !== businessSlug) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
  }

  // Token firmado
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Falta token' }, { status: 400 });
  }
  const verdict = verifyDownloadToken(token, key);
  if (!verdict.ok) {
    return NextResponse.json({ error: `Token inválido: ${verdict.reason}` }, { status: 403 });
  }

  let payload: { data: Buffer; contentType: string };
  try {
    payload = await getStorage().read(key);
  } catch {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(payload.data), {
    status: 200,
    headers: {
      'Content-Type': payload.contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(verdict.filename)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
