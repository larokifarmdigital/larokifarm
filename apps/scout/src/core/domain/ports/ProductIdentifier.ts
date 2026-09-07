import type { MedicamentoInfo } from '../models/MedicamentoInfo';

/**
 * Puerto: identifica un producto a partir de su Código Nacional (CN).
 * Implementación típica: CIMA (medicamentos regulados en España).
 */

export interface ProductLookupResult {
  nombre?: string;
  ean?: string;
}

export type ProductIdentifierResult =
  | { ok: true; nombre?: string; ean?: string }
  | { ok: false; error: string };

export type ProductFullInfoResult =
  | { ok: true; info: MedicamentoInfo }
  | { ok: false; error: string };

export interface ProductIdentifier {
  /** Lookup rápido: solo nombre + EAN (usado por el use case comparePrice). */
  lookupByCn(cn: string): Promise<ProductIdentifierResult>;
  /** Info completa: prospecto, principios activos, laboratorio, etc.
   *  Usado por la UI para enriquecer la card del producto identificado. */
  getFullInfo(cn: string): Promise<ProductFullInfoResult>;
}
