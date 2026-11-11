import type { SaveResult } from '@/core/shared';
import { slugify } from '@/shared/lib/slugify';
import type { Farmacia, FarmaciaRepository } from '@/core/farmacias/domain';

export type CreateFarmaciaInput = { nombre: string; ciudad: string; slug?: string };

/** Valida nombre/slug (el slug se deriva del nombre si viene vacío) y crea. */
export class CreateFarmaciaUseCase {
  constructor(private readonly repo: FarmaciaRepository) {}

  async execute(input: CreateFarmaciaInput): Promise<SaveResult<Farmacia>> {
    const nombre = input.nombre.trim();
    const ciudad = input.ciudad.trim();
    const rawSlug = input.slug?.trim() ?? '';

    const fieldErrors: Record<string, string> = {};
    if (nombre.length < 2) fieldErrors.nombre = 'Nombre muy corto';
    const slug = rawSlug ? slugify(rawSlug) : slugify(nombre);
    if (!slug) fieldErrors.slug = 'Slug requerido';
    if (Object.keys(fieldErrors).length > 0) {
      return { ok: false, error: 'Revisa los campos', fieldErrors };
    }

    return this.repo.createFarmacia({ nombre, slug, ciudad });
  }
}
