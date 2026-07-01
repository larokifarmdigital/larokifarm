/**
 * API pública de `core/engine`: dominio puro + tipos del contrato del use case.
 *
 * El **use case** `ProcessAndPersistPairUseCase` NO se reexporta aquí porque
 * arrastra `@/core/storage` (con `node:crypto`) y rompe el bundle de cliente
 * cuando una vista `'use client'` importa tipos del engine. Para usar el use
 * case desde el servidor, importar directo:
 *
 *   import { ProcessAndPersistPairUseCase } from '@/core/engine/application'
 */
export * from './domain';
export type {
  PairInput,
  ProcessAndPersistPairInput,
} from './application/processAndPersistPair';
export type {
  ReconciliationDetail,
  PairResult,
  ReconciliationResponse,
} from './application/contract';
