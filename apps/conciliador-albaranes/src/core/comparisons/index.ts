/**
 * API pública de `core/comparaciones`.
 *
 * Dependencias permitidas: solo `core/shared` (importa Scope) y `core/storage`
 * (el use case GetComparisonDetail combina el repo con storage para firmar
 * URLs). NO depende de `core/usuarios` ni `core/negocios`.
 */
export * from './domain';
export { getComparisonRepository } from './infrastructure';
export * from './application';
