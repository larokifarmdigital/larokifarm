// API pública de core/farmacias — SERVER-ONLY (arrastra Prisma).
// Desde client components importa tipos/valores de '@/core/farmacias/domain'.
export * from './domain';
export * from './application';
export {
  getFarmaciaRepository,
  getContentImageRepository,
  getResenaRepository,
  getLandingDeployer,
} from './infrastructure';
