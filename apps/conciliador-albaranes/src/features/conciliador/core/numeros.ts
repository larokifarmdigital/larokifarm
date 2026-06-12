/**
 * Utilidades numéricas validadas en el prototipo (§9 del CONTEXT).
 * Puras y deterministas → cubiertas por tests.
 */

/**
 * Normaliza un Código Nacional: quita todo lo no numérico y se queda con los
 * 6 primeros dígitos. Ej.: "369694.4" → "369694"; "154054.6" → "154054".
 */
export function limpiarCN(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/\D/g, '').slice(0, 6);
}

/**
 * Normaliza un código alternativo / EAN para el cruce secundario: mayúsculas,
 * solo alfanumérico, sin truncar. Devuelve '' si queda demasiado corto (<4) para
 * evitar emparejamientos espurios por códigos triviales.
 */
export function limpiarAlt(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  const s = String(valor).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length >= 4 ? s : '';
}

/**
 * Parsea números soportando coma decimal, separador de miles y `%`.
 * - number → tal cual.
 * - "2,45" → 2.45 ; "1.234,56" → 1234.56 ; "21,00%" → 21 ; "154054.6" → 154054.6
 * Si no es parseable, 0.
 */
export function num(valor: unknown): number {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  if (valor === null || valor === undefined) return 0;

  let s = String(valor).trim().replace(/%/g, '').trim();
  if (s === '') return 0;

  const tieneComa = s.includes(',');
  const tienePunto = s.includes('.');

  if (tieneComa && tienePunto) {
    // El último separador que aparece es el decimal.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // coma decimal → puntos son miles
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // punto decimal → comas son miles
      s = s.replace(/,/g, '');
    }
  } else if (tieneComa) {
    // solo coma → coma decimal
    s = s.replace(',', '.');
  }
  // solo punto o sin separadores → se deja (punto = decimal)

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
