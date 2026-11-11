/**
 * Proxy GET para servir imágenes de contenido desde R2 (o storage local en dev).
 *
 * Imágenes PÚBLICAS por diseño: las webs de las farmacias (apps/torrents,
 * apps/chamarro) van a cargar estas URLs desde el navegador del visitante,
 * sin cookie de sesión del backoffice. No se filtra por tenant en el GET —
 * si conoces el id de la imagen, la ves. (Equivalente a Sanity CDN que ya
 * exponía las imágenes públicamente.)
 *
 * Cachéo largo: inmutable + 1 año. Los ids son cuids irrepetibles y las
 * imágenes NO se reescriben in-place (delete + re-upload → id nuevo).
 */

import { NextResponse } from 'next/server';
import { GetContentImageFileUseCase, getContentImageRepository } from '@/core/farmacias';
import { getStorage } from '@/core/storage';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await new GetContentImageFileUseCase(getContentImageRepository(), getStorage()).execute(id);

  if (!res.ok) {
    return res.reason === 'not-found'
      ? NextResponse.json({ error: 'Not found' }, { status: 404 })
      : NextResponse.json({ error: 'Storage read failed' }, { status: 502 });
  }

  return new NextResponse(new Uint8Array(res.data), {
    status: 200,
    headers: {
      'Content-Type': res.contentType,
      'Content-Length': String(res.sizeBytes),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
