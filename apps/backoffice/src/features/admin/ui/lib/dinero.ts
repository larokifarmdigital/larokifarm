/** "1,20 $"; por debajo de un céntimo, "menos de 0,01 $". */
export function dolares(n: number): string {
  if (n > 0 && n < 0.01) return 'menos de 0,01 $';
  return `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

/** Límite para escribirlo en un campo: 20 → "20", 12.5 → "12,50". */
export function limiteEnCampo(n: number | null): string {
  if (n === null) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',');
}
