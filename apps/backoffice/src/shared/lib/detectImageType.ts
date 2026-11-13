import sharp from 'sharp';

export type DetectedImageType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' | 'image/svg+xml';

const BY_FORMAT: Record<string, DetectedImageType> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

/**
 * Tipo REAL del archivo a partir de sus bytes (no del MIME que declara el
 * navegador, que se puede falsificar). null = no es una imagen admitida.
 */
export async function detectImageType(bytes: Buffer): Promise<DetectedImageType | null> {
  const head = bytes.subarray(0, 1024).toString('utf8').replace(/^\uFEFF/, '').trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return 'image/svg+xml';
  try {
    const { format } = await sharp(bytes, { failOn: 'error' }).metadata();
    return (format && BY_FORMAT[format]) || null;
  } catch {
    return null;
  }
}
