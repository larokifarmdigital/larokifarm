import type { MultilangText } from '@/core/shared';
import type { ContentImageRole } from '../contentImageKey';

// PORT: metadatos de las imágenes de contenido (el binario va a core/storage).

export type ContentImageRecord = {
  id: string;
  businessId: string;
  role: string;
  storageKey: string;
  publicUrl: string;
  sizeBytes: number | null;
};

export type CreateContentImageInput = {
  id: string;
  businessId: string;
  role: ContentImageRole;
  storageKey: string;
  publicUrl: string;
  alt: MultilangText;
  sizeBytes: number;
};

export interface ContentImageRepository {
  /** Slug del negocio (para construir la key) o null si no existe. */
  getBusinessSlug(businessId: string): Promise<string | null>;
  findById(id: string): Promise<ContentImageRecord | null>;
  /** Crea la fila al final del orden actual de ese role. */
  create(input: CreateContentImageInput): Promise<ContentImageRecord>;
  delete(id: string): Promise<void>;
  /** Cuántos de `ids` pertenecen a ese negocio + role. */
  countOwned(ids: string[], businessId: string, role: ContentImageRole): Promise<number>;
  /** Asigna `orden = índice` a cada id, en una transacción. */
  reorder(orderedIds: string[]): Promise<void>;
}
