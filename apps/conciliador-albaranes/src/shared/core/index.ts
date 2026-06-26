/**
 * API pública de `shared/core`.
 *
 * Dominio + puertos + adapters + factories que comparten varias features.
 * Los features importan SIEMPRE desde aquí — nunca toquen rutas internas.
 */
export * from './domain';
export {
  getComparisonRepository,
  getStorage,
  getBusinessRepository,
  getUserRepository,
  verifyDownloadToken,
} from './infrastructure';
