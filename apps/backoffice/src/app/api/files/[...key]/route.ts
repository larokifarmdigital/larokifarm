// NOTE: acceso = sesión válida + scoping por primer segmento del key (businessSlug); SUPER_ADMIN puede leer cualquier negocio.
import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/core/auth';
import { prisma } from '@/shared/lib/prisma';
import { getStorage } from '@/core/storage';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { key: keyParts } = await params;
  const key = keyParts.join('/');

  const [businessSlug] = keyParts;
  if (session.user.role !== 'SUPER_ADMIN') {
    if (!session.user.businessId) {
      return NextResponse.json(
        { error: 'Sin negocio asignado' },
        { status: 403 },
      );
    }
    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: { slug: true },
    });
    if (!business || business.slug !== businessSlug) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
  }

  let payload: { data: Buffer; contentType: string };
  try {
    payload = await getStorage().read(key);
  } catch {
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
  }

  const filename = keyParts[keyParts.length - 1] ?? 'archivo';

  return new NextResponse(new Uint8Array(payload.data), {
    status: 200,
    headers: {
      'Content-Type': payload.contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
