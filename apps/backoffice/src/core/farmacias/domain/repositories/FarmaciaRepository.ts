import type { SaveResult } from '@/core/shared';
import type { Farmacia, FarmaciaStatus, FarmaciaSummary, ResponsableDisponible } from '../models/Farmacia';

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
  /**
   * Sin sesión y en cualquier estado. SOLO para la vista previa: quien llama
   * tiene que haber comprobado antes el enlace firmado (`verificarVistaPrevia`).
   */
  getFarmaciaBySlugSinSesion(slug: string): Promise<Farmacia | null>;
  /**
   * `expectedUpdatedAt`: control optimista. Si la farmacia cambió desde esa
   * fecha (otra pestaña/persona), no guarda y devuelve `code: 'conflict'`.
   */
  saveFarmacia(
    id: string,
    patch: Partial<Farmacia>,
    opts?: { expectedUpdatedAt?: string },
  ): Promise<SaveResult<Farmacia>>;
  /** `responsableId`: usuario sin farmacia (no SUPER_ADMIN) que pasa a gestionar la nueva. */
  createFarmacia(
    input: Pick<Farmacia, 'nombre' | 'slug' | 'ciudad' | 'idiomasActivos'> & { responsableId?: string },
  ): Promise<SaveResult<Farmacia>>;
  /** Usuarios activos sin farmacia asignada (solo SUPER_ADMIN). */
  listResponsablesDisponibles(): Promise<ResponsableDisponible[]>;
  publishFarmacia(id: string, status: FarmaciaStatus): Promise<SaveResult<Farmacia>>;
  duplicateFarmacia(id: string): Promise<SaveResult<Farmacia>>;
  /**
   * Borrado definitivo. Solo SUPER_ADMIN, solo archivadas y sin datos del
   * conciliador (usuarios, conciliaciones, scout, uso). Devuelve las keys de
   * storage (imágenes, avatares) para que el caso de uso las borre.
   */
  deleteFarmacia(id: string): Promise<SaveResult<{ storageKeys: string[] }>>;
  archiveFarmacia(id: string): Promise<SaveResult<Farmacia>>;
};
