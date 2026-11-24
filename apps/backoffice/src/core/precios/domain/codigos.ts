// Códigos de producto en España: CN (código nacional, 6 dígitos; a veces con un
// 7º de control) y EAN-13. El EAN 847000 + CN + control lo tienen todos los
// medicamentos y bastante parafarmacia; el resto lleva el EAN del fabricante.

export const soloDigitos = (s: unknown) => String(s ?? '').replace(/\D/g, '');

export function eanValido(ean: string): boolean {
  if (!/^\d{13}$/.test(ean)) return false;
  const suma = [...ean.slice(0, 12)].reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (suma % 10)) % 10 === Number(ean[12]);
}

/** EAN nacional de un CN: 847000 + CN + dígito de control. */
export function eanDeCn(cn: string): string {
  const base = `847000${cn}`;
  const suma = [...base].reduce((a, d, i) => a + Number(d) * (i % 2 ? 3 : 1), 0);
  return base + ((10 - (suma % 10)) % 10);
}

/** CN de un EAN nacional (847000…), o null si es el EAN de un fabricante. */
export function cnDeEanNacional(ean: string): string | null {
  return /^847000\d{7}$/.test(ean) && eanValido(ean) ? ean.slice(6, 12) : null;
}

/**
 * CN que muestra una ficha (sku, referencia, "Código:"). Estricto a propósito:
 * "760017", "7600176" o "760017.6" valen SOLO si el 7º dígito es el de control
 * (el mismo que el del EAN 847000+CN). Así "165892-6" (pack de 6) o "165892.1"
 * (duplo, en Farmacia Market) NO son el CN 165892. También acepta un EAN
 * nacional, con o sin letras delante ("CI8470002141926").
 */
export function cnDeCodigo(codigo: unknown): string | null {
  const t = String(codigo ?? '').trim();
  if (/^\d{6}$/.test(t)) return t;
  if (/^\d{6}\.?\d$/.test(t)) {
    const cn = t.slice(0, 6);
    return t.slice(-1) === eanDeCn(cn).slice(-1) ? cn : null;
  }
  const ean = t.match(/^[A-Z]{0,4}(847000\d{7})$/)?.[1];
  return ean ? cnDeEanNacional(ean) : null;
}

/** Lo que escribió el usuario en el buscador. */
export type Busqueda =
  | { tipo: 'cn'; cn: string }
  | { tipo: 'ean'; ean: string }
  | { tipo: 'nombre'; texto: string };

export function interpretarBusqueda(texto: string): Busqueda | null {
  const t = texto.trim();
  if (!t) return null;
  const d = soloDigitos(t);
  // Solo cifras (con espacios, puntos o guiones): es un código.
  if (/^[\d\s.-]+$/.test(t)) {
    if (d.length === 13) {
      const cn = cnDeEanNacional(d);
      return cn ? { tipo: 'cn', cn } : { tipo: 'ean', ean: d };
    }
    if (d.length === 6 || d.length === 7) return { tipo: 'cn', cn: d.slice(0, 6) };
  }
  return t.length >= 3 ? { tipo: 'nombre', texto: t } : null;
}

export function parsePrecio(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null;
  let s = String(v).trim().replace(/[^\d.,]/g, '');
  if (!s) return null;
  const coma = s.lastIndexOf(',');
  const punto = s.lastIndexOf('.');
  if (coma > -1 && punto > -1) s = coma > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (coma > -1) s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}
