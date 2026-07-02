import type {
  BusinessRow,
  CreateBusinessInput,
  UpdateBusinessInput,
} from '../models/Business';

// NOTE: los checks de rol viven en los use cases, no aquí.
export interface BusinessRepository {
  list(): Promise<BusinessRow[]>;
  findById(id: string): Promise<BusinessRow | null>;
  findBySlug(slug: string): Promise<BusinessRow | null>;
  create(input: CreateBusinessInput): Promise<BusinessRow>;
  update(id: string, input: UpdateBusinessInput): Promise<BusinessRow>;
  delete(id: string): Promise<void>;
  getDecryptedGeminiKey(id: string): Promise<string | null>;
}
