// Sube una captura de una incidencia del comparador de precios. Se guarda en
// el almacenamiento (R2) re-codificada a WebP con sharp: sin metadatos (EXIF,
// ubicación) y sin nada que no sea una imagen. El enlace solo lo abre la
// cuenta de administración (ver capturas/[...key]).
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { createId } from '@paralleldrive/cuid2';
import { auth, puedeUsarModulo } from '@/core/auth';
import { getStorage } from '@/core/storage';
import { detectImageType } from '@/shared/lib/detectImageType';

export const runtime = 'nodejs';

const MAX_BYTES = 4 * 1024 * 1024;
const ADMITIDOS = ['image/png', 'image/jpeg', 'image/webp'];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (session.user.role !== 'SUPER_ADMIN' && !(await puedeUsarModulo(session.user.id, 'comparador'))) {
    return NextResponse.json({ error: 'No tienes activado el comparador de precios.' }, { status: 403 });
  }
  const form = await req.formData().catch(() => null);
  const archivo = form?.get('captura');
  if (!(archivo instanceof File)) return NextResponse.json({ error: 'Falta la captura.' }, { status: 400 });
  if (archivo.size > MAX_BYTES) return NextResponse.json({ error: 'La captura pesa demasiado (máximo 4 MB).' }, { status: 413 });

  const bytes = Buffer.from(await archivo.arrayBuffer());
  const tipo = await detectImageType(bytes);
  if (!tipo || !ADMITIDOS.includes(tipo)) {
    return NextResponse.json({ error: 'Solo se admiten imágenes PNG, JPG o WebP.' }, { status: 415 });
  }

  let webp: Buffer;
  try {
    webp = await sharp(bytes, { failOn: 'error' }).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch {
    return NextResponse.json({ error: 'No se ha podido leer la imagen.' }, { status: 415 });
  }
  const ahora = new Date();
  const key = `incidencias/precios/${ahora.getUTCFullYear()}/${String(ahora.getUTCMonth() + 1).padStart(2, '0')}/${createId()}.webp`;
  await getStorage().upload(key, webp, 'image/webp');
  return NextResponse.json({ url: `/api/incidencias/capturas/${key}` }, { status: 201 });
}
