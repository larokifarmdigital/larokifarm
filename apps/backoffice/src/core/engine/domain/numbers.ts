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

// NOTE: el dígito de control del C.N. español es el del EAN-13 "847000" + CN
// (ej. CN 154267 → EAN 8470001542670 → control 0 → impreso "1542670").
export function cnCheckDigitOk(cn7: string): boolean {
  if (!/^\d{7}$/.test(cn7)) return false;
  const ean12 = `847000${cn7.slice(0, 6)}`;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(ean12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === Number(cn7[6]);
}

// NOTE: candidatos a C.N. (6 dígitos) sacados de TODOS los códigos crudos de
// una línea (nationalCode, code, ean y la lista `codes` que imprime la celda).
// Caso Bayer: la celda trae el interno del proveedor y el C.N. apilados, y a
// veces el interno también tiene 7 dígitos ("4480949"), así que no se puede
// decidir por longitud: se prueban todos contra el pedido y gana el que cruce.
// Orden de preferencia (solo desempata, el pedido es quien decide):
//   1) 7 dígitos con dígito de control válido, o EAN-13 "847000…"
//   2) 6 dígitos exactos o "XXXXXX.X"
//   3) 7 dígitos con dígito de control NO válido (puede ser un interno)
// Ignora 8+ dígitos (internos tipo "87430014") y códigos con letras.
export function cnCandidates(raws: ReadonlyArray<unknown>): string[] {
  const ranked: Array<{ cn: string; rank: number }> = [];
  for (const raw of raws) {
    if (raw === null || raw === undefined) continue;
    const s = String(raw).trim().replace(/\s+/g, '');
    if (s === '') continue;
    const ean = /^847000(\d{6})\d$/.exec(s);
    if (ean) {
      ranked.push({ cn: ean[1], rank: 1 });
      continue;
    }
    const m = CN_LIKE.exec(s);
    if (!m) continue;
    const rank = /^\d{7}$/.test(s) ? (cnCheckDigitOk(s) ? 1 : 3) : 2;
    ranked.push({ cn: m[1], rank });
  }
  const seen = new Set<string>();
  return ranked
    .map((r, i) => ({ ...r, i }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((r) => r.cn)
    .filter((cn) => (seen.has(cn) ? false : (seen.add(cn), true)));
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
