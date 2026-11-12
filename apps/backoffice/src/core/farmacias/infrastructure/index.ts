// Factories de adapters de core/farmacias.
import type { ContentImageRepository, FarmaciaRepository, ResenaRepository } from '@/core/farmacias/domain';
import { contentImageRepositoryPrisma } from './ContentImageRepositoryPrisma';
import { farmaciaRepositoryMock } from './FarmaciaRepositoryMock';
import { farmaciaRepositoryPrisma } from './FarmaciaRepositoryPrisma';
import { resenaRepositoryPrisma } from './ResenaRepositoryPrisma';

/**
 * Flag: USE_NEON_CONTENT=true activa el repo real (Prisma → Neon).
 * Por defecto se queda en mock para no romper nada hasta que todo esté
 * validado. Para probar en dev: añadir `USE_NEON_CONTENT=true` al .env.local.
 */
export function getFarmaciaRepository(): FarmaciaRepository {
  return process.env.USE_NEON_CONTENT === 'true' ? farmaciaRepositoryPrisma : farmaciaRepositoryMock;
}

/** Las imágenes solo existen en Neon (no hay mock). */
export function getContentImageRepository(): ContentImageRepository {
  return contentImageRepositoryPrisma;
}

/** Las reseñas solo existen en Neon (migradas desde Sanity). */
export function getResenaRepository(): ResenaRepository {
  return resenaRepositoryPrisma;
}
