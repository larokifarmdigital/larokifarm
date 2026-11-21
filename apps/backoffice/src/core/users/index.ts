// API pública de core/users — gestión de cuentas (server-only).
// Dependencias cross-core: core/shared.
export * from './domain';
export * from './application';
export { getUserAccountRepository } from './infrastructure';
