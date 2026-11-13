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
import { READ_ONLY_ERROR, canEditContent, getCurrentUser } from '@/core/auth';
import { detectImageType } from '@/shared/lib/detectImageType';
import type { MultilangText, SaveResult } from '@/core/shared';
import type { StorageRepository } from '@/core/storage';
import {
  CONTENT_IMAGE_ROLES,
  buildContentImageKey,
  type ContentImageRepository,
  type ContentImageRole,
  type ImagenAsset,
} from '@/core/farmacias/domain';

/** Por debajo del límite de body de Vercel (4,5 MB). El editor comprime antes de subir. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

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
  if (!canEditContent(user)) throw new Error(READ_ONLY_ERROR);
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

      if (file.bytes.byteLength > MAX_IMAGE_BYTES) {
        return { ok: false, error: `Imagen muy grande (máx ${MAX_IMAGE_BYTES / 1024 / 1024} MB)` };
      }
      // El tipo se saca de los bytes, no del MIME que manda el navegador.
      const contentType = await detectImageType(file.bytes);
      if (!contentType) {
        return { ok: false, error: 'El archivo no es una imagen válida. Usa PNG, JPG, WebP, SVG o GIF.' };
      }

      const id = cuid();
      const storageKey = buildContentImageKey({ businessSlug: slug, role, cuid: id, filename: file.name });
      await this.storage.upload(storageKey, file.bytes, contentType);

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

export class UpdateContentImageAltUseCase {
  constructor(private readonly images: ContentImageRepository) {}

  async execute(businessId: string, imageId: string, alt: MultilangText): Promise<VoidResult> {
    try {
      await ensureCanWriteBusiness(this.images, businessId);
      const img = await this.images.findById(imageId);
      if (!img) return { ok: false, error: 'Imagen no encontrada' };
      if (img.businessId !== businessId) return { ok: false, error: 'Imagen de otro negocio' };
      await this.images.updateAlt(imageId, alt);
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
