/**
 * Modelo de Business (farmacia).
 *
 * El campo `geminiKeyEnc` está cifrado con AES-GCM (`shared/lib/crypto`).
 * Las shapes públicas nunca exponen el ciphertext — los handlers/use cases
 * lo descifran al vuelo cuando hace falta.
 */

export interface BusinessRow {
  id: string;
  slug: string;
  name: string;
  hasGeminiKey: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBusinessInput {
  slug: string;
  name: string;
}

export interface UpdateBusinessInput {
  name?: string;
  /** `null` = limpiar (volver a fallback global). `undefined` = no tocar. */
  geminiApiKey?: string | null;
}
