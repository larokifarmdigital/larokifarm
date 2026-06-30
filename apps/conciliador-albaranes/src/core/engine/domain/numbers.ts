/**
 * Numeric utilities validated in the prototype (§9 of CONTEXT).
 * Pure and deterministic → covered by tests.
 */

/**
 * Normalizes a National Code: strips everything non-numeric and keeps the
 * first 6 digits. E.g. "369694.4" → "369694"; "154054.6" → "154054".
 *
 * `CN` = Código Nacional (Spanish national pharma product code).
 */
export function cleanNationalCode(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\D/g, '').slice(0, 6);
}

/**
 * Normalizes an alternative code / EAN for the secondary join: uppercase,
 * alphanumeric only, no truncation. Returns '' if it is too short (<4) to
 * avoid spurious matches by trivial codes.
 */
export function cleanAlt(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length >= 4 ? s : '';
}

/**
 * Parses numbers supporting decimal comma, thousands separator and `%`.
 * - number → as-is.
 * - "2,45" → 2.45 ; "1.234,56" → 1234.56 ; "21,00%" → 21 ; "154054.6" → 154054.6
 * If not parseable, 0.
 */
export function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;

  let s = String(value).trim().replace(/%/g, '').trim();
  if (s === '') return 0;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // The last separator that appears is the decimal one.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // decimal comma → dots are thousands
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // decimal dot → commas are thousands
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    // only comma → decimal comma
    s = s.replace(',', '.');
  }
  // only dot or no separators → leave as-is (dot = decimal)

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
