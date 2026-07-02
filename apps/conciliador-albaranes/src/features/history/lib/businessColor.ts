// NOTE: mantén los hex sincronizados con los tokens de marca de `globals.css`.
const BUSINESS_COLORS: Record<string, { solid: string; soft: string }> = {
  larokifarm: { solid: '#16a34a', soft: '#dcfce7' }, // green
  laguna: { solid: '#dc2626', soft: '#fee2e2' }, // red
  torrents: { solid: '#0d9488', soft: '#ccfbf1' }, // teal
  chamarro: { solid: '#64748b', soft: '#f1f5f9' }, // slate
  broggi: { solid: '#d97706', soft: '#fef3c7' }, // amber
};

const FALLBACK = { solid: '#94a3b8', soft: '#f1f5f9' };

export function businessColor(slug: string | undefined | null): string {
  if (!slug) return FALLBACK.solid;
  return BUSINESS_COLORS[slug]?.solid ?? FALLBACK.solid;
}

export function businessColorSoft(slug: string | undefined | null): string {
  if (!slug) return FALLBACK.soft;
  return BUSINESS_COLORS[slug]?.soft ?? FALLBACK.soft;
}
