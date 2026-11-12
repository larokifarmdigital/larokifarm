import sharp from 'sharp';

/**
 * Redimensionado on-the-fly con los MISMOS query params que el CDN de Sanity
 * (`?w=&h=&q=&fit=crop|max&auto=format`), para que el helper `imagenSanity()`
 * de las landings siga funcionando igual con imágenes servidas desde R2.
 *
 * Sin params → devuelve el original intacto.
 */
const MAX_SIDE = 2560;

export async function transformImage(
  data: Buffer,
  contentType: string,
  searchParams: URLSearchParams,
): Promise<{ data: Buffer; contentType: string }> {
  const dim = (k: string) => {
    const n = Number(searchParams.get(k));
    return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), MAX_SIDE) : undefined;
  };
  const w = dim('w');
  const h = dim('h');
  const toWebp = searchParams.get('auto') === 'format';
  if ((!w && !h && !toWebp) || contentType === 'image/svg+xml' || contentType === 'image/gif') {
    return { data, contentType };
  }

  const q = Math.min(Math.max(Number(searchParams.get('q')) || 80, 1), 100);
  let img = sharp(data, { failOn: 'none' }).rotate();
  if (w || h) {
    img = img.resize({
      width: w,
      height: h,
      fit: searchParams.get('fit') === 'crop' ? 'cover' : 'inside',
      withoutEnlargement: true,
    });
  }
  if (toWebp) return { data: await img.webp({ quality: q }).toBuffer(), contentType: 'image/webp' };
  if (contentType === 'image/png') return { data: await img.png().toBuffer(), contentType };
  return { data: await img.jpeg({ quality: q, mozjpeg: true }).toBuffer(), contentType: 'image/jpeg' };
}
