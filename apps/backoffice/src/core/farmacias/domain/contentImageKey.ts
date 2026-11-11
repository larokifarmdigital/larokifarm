// Keys para content images en el storage.
// Layout: <businessSlug>/content/<role>/<yyyy>/<cuid>-<safeName>.<ext>

export const CONTENT_IMAGE_ROLES = ['logo', 'hero', 'sobre', 'servicio', 'gallery', 'og'] as const;
export type ContentImageRole = (typeof CONTENT_IMAGE_ROLES)[number];

export function buildContentImageKey(params: {
  businessSlug: string;
  role: ContentImageRole;
  cuid: string;
  filename: string;
  createdAt?: Date;
}): string {
  const year = (params.createdAt ?? new Date()).getUTCFullYear();
  const safe = sanitizeFilename(params.filename);
  return [params.businessSlug, 'content', params.role, String(year), `${params.cuid}-${safe}`].join('/');
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|\s]+/g, '_').slice(0, 180);
}
