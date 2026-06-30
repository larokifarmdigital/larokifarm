/**
 * API pública de `core/usuarios`. Dependencias: solo `core/shared` (Role/Scope).
 */
export * from './domain';
export { getUserRepository } from './infrastructure';
export * from './application';
