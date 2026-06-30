/**
 * API pública de `core/storage`. Sin dependencias cross-core.
 *
 * Driver actual: local. El driver `spaces` (DO Spaces) se añade en Fase 6.
 */
export * from './domain';
export { getStorage, verifyDownloadToken } from './infrastructure';
