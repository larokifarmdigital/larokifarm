export function formatRelativeDate(iso: string, locale: string = 'es-ES'): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffMin = Math.round(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffMin < 1) return 'hace un momento';
  if (diffMin < 60) return rtf.format(-diffMin, 'minute');
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return rtf.format(-diffH, 'hour');
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return rtf.format(-diffD, 'day');
  const diffMo = Math.round(diffD / 30);
  if (diffMo < 12) return rtf.format(-diffMo, 'month');
  return rtf.format(-Math.round(diffMo / 12), 'year');
}
