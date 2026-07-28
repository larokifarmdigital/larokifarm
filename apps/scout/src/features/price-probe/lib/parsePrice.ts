export function parsePrice(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;

  let s = String(v).trim().replace(/[^\d.,-]/g, '');
  if (!s) return null;

  const coma = s.lastIndexOf(',');
  const punto = s.lastIndexOf('.');

  if (coma > -1 && punto > -1) {
    s = coma > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (coma > -1) {
    s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}
