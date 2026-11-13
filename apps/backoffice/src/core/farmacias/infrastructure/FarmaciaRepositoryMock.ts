// Adapter en memoria (seed: farmaciasMock). Por defecto en dev hasta activar
// USE_NEON_CONTENT=true — ver infrastructure/index.ts.
import type { Farmacia, FarmaciaRepository, FarmaciaSummary } from '@/core/farmacias/domain';
import { MOCK_FARMACIAS } from './farmaciasMock';
import { sleep } from '@/shared/lib/sleep';

const store = new Map<string, Farmacia>(
  MOCK_FARMACIAS.map((f) => [f.id, structuredClone(f)]),
);

const NETWORK_DELAY_MS = 250;

function toSummary(f: Farmacia): FarmaciaSummary {
  return {
    id: f.id,
    slug: f.slug,
    nombre: f.nombre,
    ciudad: f.ciudad,
    status: f.status,
    idiomasActivos: f.idiomasActivos,
    updatedAt: f.updatedAt,
    logo: f.logo,
  };
}

export const farmaciaRepositoryMock: FarmaciaRepository = {
  async listFarmacias() {
    await sleep(NETWORK_DELAY_MS);
    return Array.from(store.values())
      .map(toSummary)
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  },

  async getFarmacia(id) {
    await sleep(NETWORK_DELAY_MS);
    const f = store.get(id);
    return f ? structuredClone(f) : null;
  },

  async getFarmaciaBySlug(slug) {
    await sleep(NETWORK_DELAY_MS);
    for (const f of store.values()) {
      if (f.slug === slug) return structuredClone(f);
    }
    return null;
  },

  async getPublishedFarmaciaBySlug(slug) {
    const f = [...store.values()].find((x) => x.slug === slug && x.status === 'published');
    return f ? structuredClone(f) : null;
  },

  async saveFarmacia(id, patch, opts) {
    await sleep(NETWORK_DELAY_MS);
    const current = store.get(id);
    if (!current) return { ok: false, error: 'Farmacia no encontrada' };
    if (opts?.expectedUpdatedAt && opts.expectedUpdatedAt !== current.updatedAt) {
      return { ok: false, code: 'conflict', error: 'Esta farmacia se ha modificado en otra pestaña o por otra persona.' };
    }

    if (patch.slug && patch.slug !== current.slug) {
      for (const f of store.values()) {
        if (f.id !== id && f.slug === patch.slug) {
          return {
            ok: false,
            error: 'Slug en uso',
            fieldErrors: { slug: `El slug "${patch.slug}" ya está en uso` },
          };
        }
      }
    }

    const updated: Farmacia = {
      ...current,
      ...patch,
      id: current.id,
      updatedAt: new Date().toISOString(),
    };
    store.set(id, updated);
    return { ok: true, data: structuredClone(updated) };
  },

  async createFarmacia(input) {
    await sleep(NETWORK_DELAY_MS);
    for (const f of store.values()) {
      if (f.slug === input.slug) {
        return {
          ok: false,
          error: 'Slug en uso',
          fieldErrors: { slug: `El slug "${input.slug}" ya está en uso` },
        };
      }
    }
    const now = new Date().toISOString();
    const farmacia: Farmacia = {
      id: `farm_${Math.random().toString(36).slice(2, 10)}`,
      slug: input.slug,
      nombre: input.nombre,
      status: 'draft',
      idiomasActivos: input.idiomasActivos,
      ciudad: input.ciudad,
      descripcionCorta: {},
      descripcionLarga: {},
      heroImages: [],
      horarios: [],
      servicios: [],
      faqs: [],
      resenas: [],
      createdAt: now,
      updatedAt: now,
    };
    store.set(farmacia.id, farmacia);
    return { ok: true, data: structuredClone(farmacia) };
  },

  async publishFarmacia(id, status) {
    return this.saveFarmacia(id, { status });
  },

  async duplicateFarmacia(id) {
    await sleep(NETWORK_DELAY_MS);
    const src = store.get(id);
    if (!src) return { ok: false, error: 'Farmacia no encontrada' };
    const now = new Date().toISOString();
    const copy: Farmacia = {
      ...structuredClone(src),
      id: `farm_${Math.random().toString(36).slice(2, 10)}`,
      slug: `${src.slug}-copia`,
      nombre: `${src.nombre} (copia)`,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };
    store.set(copy.id, copy);
    return { ok: true, data: structuredClone(copy) };
  },

  async archiveFarmacia(id) {
    return this.saveFarmacia(id, { status: 'archived' });
  },
};
