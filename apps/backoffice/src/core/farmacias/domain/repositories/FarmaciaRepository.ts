import type { SaveResult } from '@/core/shared';
import type { Farmacia, FarmaciaStatus, FarmaciaSummary } from '../models/Farmacia';

// PORT: contrato de persistencia de farmacias. Adapters en infrastructure/
// (Prisma → Neon y mock en memoria).
export type FarmaciaRepository = {
  listFarmacias(): Promise<FarmaciaSummary[]>;
  getFarmacia(id: string): Promise<Farmacia | null>;
  getFarmaciaBySlug(slug: string): Promise<Farmacia | null>;
  /**
   * Lectura PÚBLICA (sin sesión ni filtro de tenant) para las landings.
   * Solo devuelve farmacias con status `published`.
   */
  getPublishedFarmaciaBySlug(slug: string): Promise<Farmacia | null>;
  saveFarmacia(id: string, patch: Partial<Farmacia>): Promise<SaveResult<Farmacia>>;
  createFarmacia(
    input: Pick<Farmacia, 'nombre' | 'slug' | 'ciudad' | 'idiomasActivos'>,
  ): Promise<SaveResult<Farmacia>>;
  publishFarmacia(id: string, status: FarmaciaStatus): Promise<SaveResult<Farmacia>>;
  duplicateFarmacia(id: string): Promise<SaveResult<Farmacia>>;
  archiveFarmacia(id: string): Promise<SaveResult<Farmacia>>;
};
