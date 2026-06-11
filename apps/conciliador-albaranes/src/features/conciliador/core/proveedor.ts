/**
 * Normalización del nombre de proveedor para el emparejado del Modo Masivo (§8).
 * Mayúsculas, sin tildes, sin sufijos societarios (S.L., S.A., S.L.U., …),
 * sin puntuación ni espacios sobrantes. Así "Dentaid S.L." === "DENTAID".
 */
export function normalizarProveedor(nombre: string | null | undefined): string {
  if (!nombre) return '';

  let s = String(nombre)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar tildes/diacríticos
    .replace(/[^A-Z0-9 ]/g, ' ') // puntuación → espacio ("S.L." → "S L ")
    .replace(/\s+/g, ' ')
    .trim();

  // Sufijos societarios (admiten que la puntuación los haya dejado como letras sueltas).
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

/** ¿Dos nombres de proveedor son el mismo una vez normalizados? */
export function mismoProveedor(a: string | undefined, b: string | undefined): boolean {
  const na = normalizarProveedor(a);
  const nb = normalizarProveedor(b);
  return na !== '' && na === nb;
}
