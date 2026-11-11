/**
 * Use cases de imágenes de contenido (hero, sobre, logo…).
 *
 * Multi-tenant: cada operación valida que la farmacia pertenece al
 * businessId del usuario en sesión, excepto SUPER_ADMIN (ve todos).
 *
 * Las imágenes se sirven vía /api/content-images/<id> (proxy al storage).
 * Son PÚBLICAS por diseño: las landings las cargan sin sesión del backoffice.
 */

import { createId as cuid } from '@paralleldrive/cuid2';
import { getCurrentUser } from '@/core/auth';
import type { MultilangText, SaveResult } from '@/core/shared';
import type { StorageRepository } from '@/core/storage';
import {
  CONTENT_IMAGE_ROLES,
  buildContentImageKey,
  type ContentImageRepository,
  type ContentImageRole,
  type ImagenAsset,
} from '@/core/farmacias/domain';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];

type VoidResult = { ok: true } | { ok: false; error: string };

export type UploadContentImageInput = {
  businessId: string;
  role: ContentImageRole;
  file: { name: string; type: string; size: number; bytes: Buffer };
  alt: MultilangText;
};

async function ensureCanWriteBusiness(repo: ContentImageRepository, businessId: string): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Sesión requerida');
  if (user.rol !== 'admin' && user.farmaciaId !== businessId) {
    throw new Error('Acceso denegado al negocio');
  }
  const slug = await repo.getBusinessSlug(businessId);
  if (!slug) throw new Error('Farmacia no encontrada');
  return slug;
}

function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export class UploadContentImageUseCase {
  constructor(
    private readonly images: ContentImageRepository,
    private readonly storage: StorageRepository,
  ) {}

  async execute({ businessId, role, file, alt }: UploadContentImageInput): Promise<SaveResult<ImagenAsset>> {
    try {
      if (!CONTENT_IMAGE_ROLES.includes(role)) return { ok: false, error: `Role inválido: ${role}` };

      const slug = await ensureCanWriteBusiness(this.images, businessId);

      if (file.size > MAX_BYTES) {
        return { ok: false, error: `Imagen muy grande (máx ${Math.round(MAX_BYTES / 1024 / 1024)} MB)` };
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return { ok: false, error: `Formato no permitido: ${file.type}. Usa PNG, JPG, WebP, SVG o GIF.` };
      }

      const id = cuid();
      const storageKey = buildContentImageKey({ businessSlug: slug, role, cuid: id, filename: file.name });
      await this.storage.upload(storageKey, file.bytes, file.type);

      // NOTE: sin dimensiones (haría falta sharp/image-size) — fuera de scope.
      const row = await this.images.create({
        id,
        businessId,
        role,
        storageKey,
        publicUrl: `/api/content-images/${id}`,
        alt,
        sizeBytes: file.bytes.byteLength,
      });

      return { ok: true, data: { id: row.id, url: row.publicUrl, alt, peso: row.sizeBytes ?? undefined } };
    } catch (e) {
      return { ok: false, error: errorMessage(e, 'Error desconocido al subir') };
    }
  }
}

export class DeleteContentImageUseCase {
  constructor(
    private readonly images: ContentImageRepository,
    private readonly storage: StorageRepository,
  ) {}

  async execute(businessId: string, imageId: string): Promise<VoidResult> {
    try {
      await ensureCanWriteBusiness(this.images, businessId);

      const img = await this.images.findById(imageId);
      if (!img) return { ok: false, error: 'Imagen no encontrada' };
      if (img.businessId !== businessId) return { ok: false, error: 'Imagen de otro negocio' };

      // Borrar primero del storage (best-effort) y luego la fila.
      try {
        await this.storage.delete(img.storageKey);
      } catch {
        /* best-effort — si el objeto ya no está, seguimos */
      }
      await this.images.delete(imageId);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errorMessage(e, 'Error desconocido') };
    }
  }
}

export class ReorderContentImagesUseCase {
  constructor(private readonly images: ContentImageRepository) {}

  async execute(businessId: string, role: ContentImageRole, orderedIds: string[]): Promise<VoidResult> {
    try {
      await ensureCanWriteBusiness(this.images, businessId);

      const owned = await this.images.countOwned(orderedIds, businessId, role);
      if (owned !== orderedIds.length) {
        return { ok: false, error: 'Lista inválida (ids no pertenecen al negocio)' };
      }
      await this.images.reorder(orderedIds);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: errorMessage(e, 'Error desconocido') };
    }
  }
}

/** Lectura pública del binario (sin sesión) para el proxy /api/content-images. */
export class GetContentImageFileUseCase {
  constructor(
    private readonly images: ContentImageRepository,
    private readonly storage: StorageRepository,
  ) {}

  async execute(
    imageId: string,
  ): Promise<
    | { ok: true; data: Buffer; contentType: string; sizeBytes: number }
    | { ok: false; reason: 'not-found' | 'storage-error' }
  > {
    const img = await this.images.findById(imageId);
    if (!img) return { ok: false, reason: 'not-found' };
    try {
      const { data, contentType } = await this.storage.read(img.storageKey);
      return { ok: true, data, contentType, sizeBytes: img.sizeBytes ?? data.byteLength };
    } catch {
      return { ok: false, reason: 'storage-error' };
    }
  }
}
