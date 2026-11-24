// API pública de core/precios (comparador de precios) — server-only.
// Dependencias cross-core: core/shared (vía Prisma). Los client components
// importan tipos desde '@/core/precios/domain'.
export * from './domain';
export * from './application';
export * from './infrastructure';
