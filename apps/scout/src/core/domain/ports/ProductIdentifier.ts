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

export interface ProductIdentifier {
  lookupByCn(cn: string): Promise<ProductIdentifierResult>;
}
