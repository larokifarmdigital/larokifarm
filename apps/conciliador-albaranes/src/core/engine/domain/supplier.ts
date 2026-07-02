// NOTE: normaliza a mayúsculas sin diacríticos ni sufijos societarios (S.L., S.A., …) — "Dentaid S.L." === "DENTAID".
export function normalizeSupplier(name: string | null | undefined): string {
  if (!name) return '';

  let s = String(name)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

export function sameSupplier(a: string | undefined, b: string | undefined): boolean {
  const na = normalizeSupplier(a);
  const nb = normalizeSupplier(b);
  return na !== '' && na === nb;
}
