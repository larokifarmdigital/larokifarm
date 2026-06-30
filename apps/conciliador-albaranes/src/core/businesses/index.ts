/**
 * API pública de `core/negocios`. Sin dependencias cross-core.
 */
export * from './domain';
export { getBusinessRepository } from './infrastructure';
export * from './application';
