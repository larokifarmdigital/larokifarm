import type {
  ContentImageRepository,
  FarmaciaRepository,
  LandingDeployer,
  ResenaRepository,
} from '@/core/farmacias/domain';
import { contentImageRepositoryPrisma } from './ContentImageRepositoryPrisma';
import { farmaciaRepositoryMock } from './FarmaciaRepositoryMock';
import { farmaciaRepositoryPrisma } from './FarmaciaRepositoryPrisma';
import { landingDeployerHttp } from './LandingDeployerHttp';
import { resenaRepositoryPrisma } from './ResenaRepositoryPrisma';

// USE_NEON_CONTENT=true activa el repo Prisma; sin él, mock en memoria.
export function getFarmaciaRepository(): FarmaciaRepository {
  return process.env.USE_NEON_CONTENT === 'true' ? farmaciaRepositoryPrisma : farmaciaRepositoryMock;
}

/** Las imágenes solo existen en Neon (no hay mock). */
export function getContentImageRepository(): ContentImageRepository {
  return contentImageRepositoryPrisma;
}

/** Las reseñas solo existen en Neon (no hay mock). */
export function getResenaRepository(): ResenaRepository {
  return resenaRepositoryPrisma;
}

export function getLandingDeployer(): LandingDeployer {
  return landingDeployerHttp;
}
