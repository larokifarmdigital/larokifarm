/**
 * Proxy GET para servir imágenes de contenido desde R2 (o storage local en dev).
 *
 * PÚBLICAS por diseño: las landings las cargan desde el navegador del visitante, sin sesión.
 * No se filtra por tenant en el GET: si conoces el id de la imagen, la ves.
 *
 * Caché inmutable de 1 año: los ids son cuids irrepetibles y las imágenes NO se reescriben
 * in-place (delete + re-upload → id nuevo).
 */

import { NextResponse } from 'next/server';
import { GetContentImageFileUseCase, getContentImageRepository } from '@/core/farmacias';
import { getStorage } from '@/core/storage';
import { USER_IMAGE_HEADERS, transformImage } from '@/shared/lib/imageTransform';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await new GetContentImageFileUseCase(getContentImageRepository(), getStorage()).execute(id);

  if (!res.ok) {
    return res.reason === 'not-found'
      ? NextResponse.json({ error: 'Not found' }, { status: 404 })
      : NextResponse.json({ error: 'Storage read failed' }, { status: 502 });
  }

  // Parámetros ?w=&h=&fit=&auto=format: ver imageTransform.
  const out = await transformImage(res.data, res.contentType, new URL(req.url).searchParams);
  return new NextResponse(new Uint8Array(out.data), {
    status: 200,
    headers: {
      ...USER_IMAGE_HEADERS,
      'Content-Type': out.contentType,
      'Content-Length': String(out.data.byteLength),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
