/**
 * Output shape of `ProcessAndPersistPairUseCase` and, by coincidence, the
 * HTTP contract for `POST /api/conciliar`. Keeping them compatible lets the
 * route handler forward without transformation.
 *
 * The fetch client in `features/reconciler` also consumes these types when
 * parsing the response — it imports them directly from `@/core/engine`.
 */
import type { DeliveryNoteLine, ReconciledLine } from '../domain/types';

export interface ReconciliationDetail {
  deliveryNoteNumber: string;
  lines: ReconciledLine[];
  /** Raw lines as extracted by Gemini (for debugging the PDF read). */
  rawLines?: DeliveryNoteLine[];
}

export interface PairResult {
  id: number;
  label: string;
  supplier: string;
  status: 'OK' | 'DISCREPANCIES' | 'ERROR';
  numDiscrepancies: number;
  reportFilename?: string;
  /** Report .xlsx as base64 (the browser assembles the ZIP). */
  reportBase64?: string;
  detail?: ReconciliationDetail;
  error?: string;
}

export interface ReconciliationResponse {
  summary: PairResult[];
}
