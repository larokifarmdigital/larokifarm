// NOTE: geminiKeyEnc va cifrado con AES-GCM y no se expone en shapes públicas.
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
