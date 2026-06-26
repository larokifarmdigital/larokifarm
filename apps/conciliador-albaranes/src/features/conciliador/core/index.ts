/**
 * Barrel del `core/` del conciliador: lo NO-UI del feature.
 *
 * Agrupa dominio (motor puro), aplicación (use cases) y contratos HTTP.
 * El feature-level `features/conciliador/index.ts` reexporta lo que es API
 * pública para que las pages/routes no entren a subcarpetas.
 */
export * from './domain';
export * from './application';
export * from './infrastructure';
export * from './http';
