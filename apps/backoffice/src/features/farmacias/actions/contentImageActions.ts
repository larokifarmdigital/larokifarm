'use server';

/**
 * Server actions de imágenes de contenido. Solo parsean FormData, delegan en
 * los use cases de core/farmacias y revalidan la ruta del editor.
 *
 * Flujo desde el editor:
 *   1. uploadContentImage(businessId, 'hero', fd) → ImagenAsset con id + url
 *   2. (opcional) reorderContentImages(businessId, 'hero', [id1, id2, …])
 *   3. deleteContentImage(businessId, id)
 */

import { revalidatePath } from 'next/cache';
import {
  DeleteContentImageUseCase,
  ReorderContentImagesUseCase,
  UploadContentImageUseCase,
  getContentImageRepository,
  type ContentImageRole,
  type ImagenAsset,
} from '@/core/farmacias';
import { LOCALES, type MultilangText, type SaveResult } from '@/core/shared';
import { getStorage } from '@/core/storage';

export async function uploadContentImage(
  businessId: string,
  role: ContentImageRole,
  formData: FormData,
): Promise<SaveResult<ImagenAsset>> {
  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'Falta el archivo' };

  const altRaw = formData.get('alt');
  const res = await new UploadContentImageUseCase(getContentImageRepository(), getStorage()).execute({
    businessId,
    role,
    file: {
      name: file.name,
      type: file.type,
      size: file.size,
      bytes: Buffer.from(await file.arrayBuffer()),
    },
    alt: typeof altRaw === 'string' ? safeParseAlt(altRaw) : {},
  });
  if (res.ok) revalidatePath(`/farmacias/${businessId}`);
  return res;
}

export async function deleteContentImage(
  businessId: string,
  imageId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await new DeleteContentImageUseCase(getContentImageRepository(), getStorage()).execute(
    businessId,
    imageId,
  );
  if (res.ok) revalidatePath(`/farmacias/${businessId}`);
  return res;
}

export async function reorderContentImages(
  businessId: string,
  role: ContentImageRole,
  orderedIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await new ReorderContentImagesUseCase(getContentImageRepository()).execute(
    businessId,
    role,
    orderedIds,
  );
  if (res.ok) revalidatePath(`/farmacias/${businessId}`);
  return res;
}

function safeParseAlt(raw: string): MultilangText {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const out: MultilangText = {};
      for (const l of LOCALES) {
        if (typeof parsed[l] === 'string') out[l] = parsed[l];
      }
      return out;
    }
  } catch {
    /* ignore */
  }
  return {};
}
