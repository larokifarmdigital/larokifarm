/**
 * Reconciliation domain: pure engine. No Next, no Prisma, no auth, no fetch
 * (with the documented exception of `extractDeliveryNote`, which calls
 * Gemini — strictly speaking it would be an adapter, but the team treats it
 * as part of the engine since it is the only external dependency and is
 * mocked in tests).
 */
export { reconcile, statusText, TOL_PRICE, TOL_QUANTITY, TOL_DISCOUNT } from './reconcile';
export { extractDeliveryNote } from './extractDeliveryNote';
export type { ExtractionResult, UsageMetadata } from './extractDeliveryNote';
export { mergeDeliveryNotes } from './mergeDeliveryNotes';
export { readOrder } from './readOrder';
export { generateReport, reportFilename } from './generateReport';
export { normalizeSupplier, sameSupplier } from './supplier';
export { cleanNationalCode, parseNumber } from './numbers';
export { fileKey, matchFiles, fileKindFromName } from './matchFiles';
export type { UploadKind } from './matchFiles';
export type {
  DeliveryNoteData,
  OrderData,
  Reconciliation,
  ReconciledLine,
  DeliveryNoteLine,
  OrderLine,
  ReconciliationStatus,
  DiscrepancyKind,
} from './types';
