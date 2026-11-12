// API pública de core/farmacias — SERVER-ONLY (arrastra Prisma).
// Desde client components importa tipos/valores de '@/core/farmacias/domain'.
//
// Dependencias cross-core: core/shared, core/auth (tenant), core/storage.
export * from './domain';
export * from './application';
export { getFarmaciaRepository, getContentImageRepository, getResenaRepository } from './infrastructure';
