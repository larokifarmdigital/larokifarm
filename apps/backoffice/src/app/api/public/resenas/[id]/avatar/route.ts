/**
 * GET /api/public/resenas/:id/avatar — foto del autor re-alojada en R2.
 *
 * Así la landing no carga imágenes de Google ("cero cookies").
 * Reseñas ocultas o eliminadas → 404. Caché larga: la foto de un id no cambia.
 */
import { NextResponse } from 'next/server';
import { GetResenaAvatarUseCase, getResenaRepository } from '@/core/farmacias';
import { getCurrentUser } from '@/core/auth';
import { getStorage } from '@/core/storage';
import { USER_IMAGE_HEADERS, transformImage } from '@/shared/lib/imageTransform';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // En el editor (sesión del backoffice) también se ven las fotos de reseñas ocultas.
  const editor = new URL(req.url).searchParams.has('editor') ? await getCurrentUser() : null;
  const res = await new GetResenaAvatarUseCase(getResenaRepository(), getStorage()).execute(
    id,
    editor ? { esAdmin: editor.rol === 'admin', farmaciaIds: editor.farmaciaIds } : undefined,
  );
  if (!res.ok) {
    return NextResponse.json({ error: res.reason === 'not-found' ? 'Not found' : 'Storage read failed' }, {
      status: res.reason === 'not-found' ? 404 : 502,
    });
  }
  const out = await transformImage(res.data, res.contentType, new URL(req.url).searchParams);
  return new NextResponse(new Uint8Array(out.data), {
    headers: {
      ...USER_IMAGE_HEADERS,
      'Content-Type': out.contentType,
      // Con ?editor la respuesta depende de la sesión: nada de caché compartida.
      'Cache-Control': editor ? 'private, no-store' : 'public, max-age=86400',
    },
  });
}
