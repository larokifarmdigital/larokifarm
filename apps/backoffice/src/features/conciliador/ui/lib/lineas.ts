import type { ReconciledLine } from '@/core/engine';

/**
 * Textos y tonos de las líneas de una conciliación EN LENGUAJE LLANO para la
 * pantalla. (El Excel del informe sigue usando `statusText` del motor.)
 */

export type TonoLinea = 'ok' | 'falta' | 'diferencia' | 'regalo';

const fmt = (n: number | null) =>
  n === null ? '—' : n.toLocaleString('es-ES', { maximumFractionDigits: 2 });

export function tonoLinea(l: ReconciledLine): TonoLinea {
  switch (l.status) {
    case 'OK':
      return 'ok';
    case 'GIFT':
      return 'regalo';
    case 'MISSING_IN_DELIVERY_NOTE':
      return 'falta';
    default:
      return 'diferencia';
  }
}

/** "Faltan unidades (pedido 12, llegan 10)", "Descuento distinto (10 % → 5 %)"… */
export function etiquetaLinea(l: ReconciledLine): string {
  switch (l.status) {
    case 'OK':
      return 'Coincide';
    case 'GIFT':
      return 'Regalo';
    case 'MISSING_IN_DELIVERY_NOTE':
      return 'Pedido pero no ha llegado';
    case 'EXTRA_IN_DELIVERY_NOTE':
      return 'Ha llegado sin pedirlo';
    case 'DISCREPANCY': {
      const partes: string[] = [];
      if (l.discrepancies.includes('units')) {
        partes.push(
          (l.unitsDelivered ?? 0) < (l.unitsOrdered ?? 0)
            ? `Faltan unidades (pedido ${fmt(l.unitsOrdered)}, llegan ${fmt(l.unitsDelivered)})`
            : `Sobran unidades (pedido ${fmt(l.unitsOrdered)}, llegan ${fmt(l.unitsDelivered)})`,
        );
      }
      if (l.discrepancies.includes('price')) {
        partes.push(`Precio distinto (${fmt(l.priceOrdered)} € → ${fmt(l.priceDelivered)} €)`);
      }
      if (l.discrepancies.includes('discount')) {
        partes.push(`Descuento distinto (${fmt(l.discountOrdered)} % → ${fmt(l.discountDelivered)} %)`);
      }
      return partes.join(' · ') || 'Hay diferencias';
    }
  }
}

export const CLASE_TONO: Record<TonoLinea, string> = {
  ok: 'bg-[var(--color-green-soft)] text-[var(--color-green-ink)]',
  falta: 'bg-[var(--color-red-soft)] text-[var(--color-red-ink)]',
  diferencia: 'bg-[var(--color-yellow-soft)] text-[var(--color-yellow-ink)]',
  regalo: 'bg-[var(--color-blue-soft)] text-[var(--color-blue-ink)]',
};

export type ResumenLineas = {
  total: number;
  ok: number;
  faltan: number;
  noPedidos: number;
  distintos: number;
  regalos: number;
  porRevisar: number;
};

export function resumirLineas(lines: ReconciledLine[]): ResumenLineas {
  const r: ResumenLineas = { total: lines.length, ok: 0, faltan: 0, noPedidos: 0, distintos: 0, regalos: 0, porRevisar: 0 };
  for (const l of lines) {
    if (l.status === 'OK') r.ok++;
    else if (l.status === 'GIFT') r.regalos++;
    else if (l.status === 'MISSING_IN_DELIVERY_NOTE') r.faltan++;
    else if (l.status === 'EXTRA_IN_DELIVERY_NOTE') r.noPedidos++;
    else r.distintos++;
  }
  r.porRevisar = r.faltan + r.noPedidos + r.distintos;
  return r;
}

/** Chips del desglose, en el orden en que se revisan. Solo los que tienen algo. */
export function chipsResumen(r: ResumenLineas): { texto: string; tono: TonoLinea }[] {
  const chips: { texto: string; tono: TonoLinea }[] = [];
  if (r.faltan) chips.push({ texto: `${r.faltan} sin llegar`, tono: 'falta' });
  if (r.distintos) chips.push({ texto: `${r.distintos} con diferencias`, tono: 'diferencia' });
  if (r.noPedidos) chips.push({ texto: `${r.noPedidos} sin pedir`, tono: 'diferencia' });
  if (r.regalos) chips.push({ texto: `${r.regalos} ${r.regalos === 1 ? 'regalo' : 'regalos'}`, tono: 'regalo' });
  return chips;
}
