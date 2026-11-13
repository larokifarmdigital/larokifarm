/**
 * Prepara una imagen en el navegador antes de subirla:
 *   - rechaza formatos que la web no puede servir (HEIC, PDF, TXT…)
 *   - las fotos grandes (típicas de móvil) se redimensionan a 2560 px y se
 *     pasan a WebP → de 5-10 MB a unos cientos de KB
 *   - si aun así pesa más que el límite del servidor, avisa en vez de subir
 *     (Vercel corta los bodies de más de 4,5 MB y la subida fallaría).
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_SIDE = 2560;
const COMPRESS_OVER_BYTES = 1.5 * 1024 * 1024;
const RASTER = ['image/png', 'image/jpeg', 'image/webp'];
const AS_IS = ['image/svg+xml', 'image/gif'];

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

export type PreparedUpload = { ok: true; file: File } | { ok: false; error: string };

export async function prepareImageUpload(file: File): Promise<PreparedUpload> {
  const type = file.type.toLowerCase();
  if (/heic|heif/.test(type) || /\.(heic|heif)$/i.test(file.name)) {
    return { ok: false, error: 'Formato HEIC (iPhone) no admitido. Expórtala como JPG o haz una captura y súbela de nuevo.' };
  }
  if (!RASTER.includes(type) && !AS_IS.includes(type)) {
    return { ok: false, error: 'Formato no permitido. Usa PNG, JPG, WebP, SVG o GIF.' };
  }

  let out = file;
  if (RASTER.includes(type)) {
    try {
      out = await downscale(file);
    } catch {
      return { ok: false, error: 'No se pudo leer la imagen. ¿Está dañada?' };
    }
  }

  if (out.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `La imagen pesa ${mb(out.size)} (máx ${mb(MAX_UPLOAD_BYTES)}). Redúcela e inténtalo de nuevo.` };
  }
  return { ok: true, file: out };
}

async function downscale(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= COMPRESS_OVER_BYTES) return file;

    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  } finally {
    bitmap.close();
  }
}

/** Mensaje si la server action revienta (red caída, body demasiado grande…). */
export const UPLOAD_NETWORK_ERROR = 'No se pudo subir la imagen. Revisa la conexión e inténtalo de nuevo.';
