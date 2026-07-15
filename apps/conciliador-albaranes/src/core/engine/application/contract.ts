// NOTE: shape compartida entre ProcessAndPersistPairUseCase, `POST /api/conciliar` y el fetch client de `features/reconciler`.
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
  /** ID de la Comparison persistida — permite reportar errores desde la vista de conciliar. */
  comparisonId?: string;
  reportFilename?: string;
  /** Report .xlsx as base64 (the browser assembles the ZIP). */
  reportBase64?: string;
  detail?: ReconciliationDetail;
  error?: string;
}

export interface ReconciliationResponse {
  summary: PairResult[];
}
