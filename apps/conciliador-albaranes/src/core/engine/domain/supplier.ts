/**
 * Supplier-name normalization for the Bulk-Mode matching (§8).
 * Uppercase, no diacritics, no corporate suffixes (S.L., S.A., S.L.U., …),
 * no punctuation and no extra whitespace. So "Dentaid S.L." === "DENTAID".
 */
export function normalizeSupplier(name: string | null | undefined): string {
  if (!name) return '';

  let s = String(name)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^A-Z0-9 ]/g, ' ') // punctuation → space ("S.L." → "S L ")
    .replace(/\s+/g, ' ')
    .trim();

  // Corporate suffixes (allow the punctuation pass to have left them as loose letters).
  s = s
    .replace(/\bSOCIEDAD\s+(LIMITADA|ANONIMA)(\s+UNIPERSONAL)?\b/g, ' ')
    .replace(/\bS\s?L\s?U\b/g, ' ') // S.L.U.
    .replace(/\bS\s?L\s?L\b/g, ' ') // S.L.L.
    .replace(/\bS\s?A\s?U\b/g, ' ') // S.A.U.
    .replace(/\bS\s?L\b/g, ' ') // S.L.
    .replace(/\bS\s?A\b/g, ' ') // S.A.
    .replace(/\bS\s?C\s?P\b/g, ' ') // S.C.P.
    .replace(/\bC\s?B\b/g, ' ') // C.B.
    .replace(/\s+/g, ' ')
    .trim();

  return s;
}

/** Are two supplier names the same once normalized? */
export function sameSupplier(a: string | undefined, b: string | undefined): boolean {
  const na = normalizeSupplier(a);
  const nb = normalizeSupplier(b);
  return na !== '' && na === nb;
}
