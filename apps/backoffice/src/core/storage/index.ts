// API pública de core/storage — server-only (arrastra node:fs y AWS SDK).
// Dependencias cross-core: ninguna.
export * from './domain';
export { getStorage } from './infrastructure';
