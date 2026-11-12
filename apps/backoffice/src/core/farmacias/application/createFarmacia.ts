import { LOCALES, type Locale, type SaveResult } from '@/core/shared';
import { slugify } from '@/shared/lib/slugify';
import type { Farmacia, FarmaciaRepository } from '@/core/farmacias/domain';

export type CreateFarmaciaInput = {
  nombre: string;
  ciudad: string;
  slug?: string;
  /** Códigos de idioma marcados; se ignoran los desconocidos. */
  idiomas: string[];
};

/** Valida nombre/slug (el slug se deriva del nombre si viene vacío) e
 *  idiomas (mínimo 1, orden canónico de LOCALES) y crea. */
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
    const idiomasActivos = LOCALES.filter((l): l is Locale => input.idiomas.includes(l));
    if (idiomasActivos.length === 0) fieldErrors.idiomas = 'Elige al menos un idioma';
    if (Object.keys(fieldErrors).length > 0) {
      return { ok: false, error: 'Revisa los campos', fieldErrors };
    }

    return this.repo.createFarmacia({ nombre, slug, ciudad, idiomasActivos });
  }
}
