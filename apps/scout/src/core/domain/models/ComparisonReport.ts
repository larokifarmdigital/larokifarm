import type { ComparisonRow } from './ComparisonRow';
import type { IdentifiedProduct } from './IdentifiedProduct';
import type { NormalizedInput } from './NormalizedInput';

/**
 * Reporte final entregado al presentation layer: qué se buscó, qué producto se identificó
 * (si aplica), qué precios se encontraron, y cuánto tardó.
 */
export type ComparisonReport = {
  input: NormalizedInput;
  product?: IdentifiedProduct;
  rows: ComparisonRow[];
  totalMs: number;
};
