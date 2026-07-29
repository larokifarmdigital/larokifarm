// NOTE: normaliza C.N. español a los primeros 6 dígitos ("369694.4" → "369694").
export function cleanNationalCode(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\D/g, '').slice(0, 6);
}

// NOTE: detecta un C.N. español embebido en el campo "code" cuando Gemini
// no lo clasificó como nationalCode. Acepta:
//   - 6 dígitos exactos ("159259")
//   - 6 dígitos + dígito de control ("7101772" → "710177", "1592590" → "159259")
//   - 6 dígitos + "." + letra/dígito ("192332.P", "159259.0")
// NO acepta 8+ dígitos (protege códigos internos largos tipo Marvis/Perrigo
// "5000036689"), ni códigos con letras (tipo "UN14080").
const CN_LIKE = /^(\d{6})(?:\d|\.[A-Z0-9])?$/i;
export function rescueNationalCode(
  nationalCode: string | undefined,
  code: string | undefined,
): string {
  if (nationalCode && nationalCode.trim() !== '') return nationalCode;
  const c = (code ?? '').trim();
  const m = CN_LIKE.exec(c);
  return m ? m[1] : '';
}

// NOTE: uppercase + alfanumérico, sin truncar; devuelve '' si length<4 para evitar joins espurios.
export function cleanAlt(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length >= 4 ? s : '';
}

// NOTE: parse tolerante — "2,45"→2.45 ; "1.234,56"→1234.56 ; "21,00%"→21 ; devuelve 0 si no parsea.
export function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined) return 0;

  let s = String(value).trim().replace(/%/g, '').trim();
  if (s === '') return 0;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    // NOTE: el último separador manda como decimal.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    s = s.replace(',', '.');
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}
