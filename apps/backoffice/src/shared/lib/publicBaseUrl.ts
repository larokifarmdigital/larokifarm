/**
 * Origen absoluto con el que se construyen las URLs de imágenes de la API
 * pública. `BACKOFFICE_PUBLIC_URL` en prod (dominio estable); en local cae al
 * origen de la request (http://localhost:3001).
 */
export function publicBaseUrl(req: Request): string {
  return (process.env.BACKOFFICE_PUBLIC_URL?.trim() || new URL(req.url).origin).replace(/\/$/, '');
}
