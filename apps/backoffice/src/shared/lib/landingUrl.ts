/**
 * URL de la web pública de una farmacia a partir de su campo «Web». Cada
 * landing vive en su propio dominio; sin web (o con una que no sea http/https)
 * no hay enlace.
 */
export function landingUrl(web: string | undefined): string | null {
  const raw = web?.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
