import type {
  BusinessRow,
  CreateBusinessInput,
  UpdateBusinessInput,
} from '../models/Business';

/**
 * Port: contrato para CRUD de negocios (farmacias).
 *
 * Operaciones administrativas — solo SUPER_ADMIN debería invocarlas. El check
 * de rol vive en el use case / action, no en el repo.
 *
 * `getDecryptedGeminiKey` devuelve la API key descifrada al vuelo (o `null` si
 * el negocio no tiene una propia). Se usa al resolver la key en `/api/conciliar`.
 */
export interface BusinessRepository {
  list(): Promise<BusinessRow[]>;
  findById(id: string): Promise<BusinessRow | null>;
  findBySlug(slug: string): Promise<BusinessRow | null>;
  create(input: CreateBusinessInput): Promise<BusinessRow>;
  update(id: string, input: UpdateBusinessInput): Promise<BusinessRow>;
  delete(id: string): Promise<void>;
  getDecryptedGeminiKey(id: string): Promise<string | null>;
}
