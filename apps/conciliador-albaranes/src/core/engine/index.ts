// NOTE: no reexportamos ProcessAndPersistPairUseCase — arrastra node:crypto y rompe bundles cliente que importan tipos del engine. Importar directo desde `@/core/engine/application`.
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
