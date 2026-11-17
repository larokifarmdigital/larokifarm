// NOTE: geminiKeyEnc va cifrado con AES-GCM y no se expone en shapes públicas.
export interface BusinessRow {
  id: string;
  slug: string;
  name: string;
  hasGeminiKey: boolean;
  /** null = sin límite. Coste tope en USD por mes calendario UTC. */
  monthlyBudgetUsd: number | null;
  /** null = sin email configurado (el modal de bloqueo cae al fallback global). */
  supportEmail: string | null;
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
  /** `null` = quitar el límite. `undefined` = no tocar. */
  monthlyBudgetUsd?: number | null;
  /** `null` = borrar el email. `undefined` = no tocar. */
  supportEmail?: string | null;
}
