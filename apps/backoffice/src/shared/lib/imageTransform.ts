import sharp from 'sharp';

/**
 * Redimensionado on-the-fly con los MISMOS query params que el CDN de Sanity
 * (`?w=&h=&q=&fit=crop|max&auto=format`), para que el helper `imagenSanity()`
 * de las landings siga funcionando igual con imágenes servidas desde R2.
 *
 * Sin params → devuelve el original intacto.
 */
const MAX_SIDE = 2560;

/**
 * Cabeceras para servir binarios subidos por usuarios. `sandbox` + CSP
 * restrictiva: un SVG con <script> abierto directamente en el navegador no
 * ejecuta nada en el dominio del backoffice. En `<img>` no afectan.
 */
export const USER_IMAGE_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
  'X-Content-Type-Options': 'nosniff',
} as const;

/** Si el binario no se puede procesar (corrupto, formato raro) devuelve el original. */
export async function transformImage(
  data: Buffer,
  contentType: string,
  searchParams: URLSearchParams,
): Promise<{ data: Buffer; contentType: string }> {
  try {
    return await transform(data, contentType, searchParams);
  } catch (e) {
    console.warn('[imageTransform] no se pudo transformar, se sirve el original:', e instanceof Error ? e.message : e);
    return { data, contentType };
  }
}

async function transform(
  data: Buffer,
  contentType: string,
  searchParams: URLSearchParams,
): Promise<{ data: Buffer; contentType: string }> {
  const dim = (k: string) => {
    const n = Number(searchParams.get(k));
    // Múltiplos de 16: limita las variantes distintas que se pueden pedir (cada una cuesta CPU).
    return Number.isFinite(n) && n > 0 ? Math.min(Math.ceil(n / 16) * 16, MAX_SIDE) : undefined;
  };
  const w = dim('w');
  const h = dim('h');
  const toWebp = searchParams.get('auto') === 'format';
  if ((!w && !h && !toWebp) || contentType === 'image/svg+xml' || contentType === 'image/gif') {
    return { data, contentType };
  }

  const q = Math.min(Math.max(Math.round((Number(searchParams.get('q')) || 80) / 5) * 5, 5), 100);
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
