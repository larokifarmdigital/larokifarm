import type { ReconciliationResponse } from '@/core/engine';

export interface PairToSend {
  label: string;
  /** 1 or N PDFs from the SAME shipment (delivery note + invoice + …). Merged server-side. */
  pdfs: File[];
  xlsx: File;
}

export interface BudgetBlockedDetail {
  supportEmail: string | null;
  spentUsd: number;
  budgetUsd: number | null;
}

/** API error that preserves the HTTP status (to distinguish 401 unauthorized). */
export class ReconcileError extends Error {
  /** Solo definido cuando el status es 402 (budget alcanzado). */
  readonly budgetBlocked?: BudgetBlockedDetail;

  constructor(
    message: string,
    readonly status: number,
    budgetBlocked?: BudgetBlockedDetail,
  ) {
    super(message);
    this.name = 'ReconcileError';
    this.budgetBlocked = budgetBlocked;
  }
}

/** Calls `POST /api/conciliar` with the completed pairs. */
export async function reconcilePairs(
  pairs: PairToSend[],
): Promise<ReconciliationResponse> {
  const fd = new FormData();
  pairs.forEach((p, i) => {
    for (const pdf of p.pdfs) fd.append(`pdfs_${i}`, pdf);
    fd.append(`xlsx_${i}`, p.xlsx);
    fd.append(`label_${i}`, p.label);
  });

  const res = await fetch('/api/conciliar', {
    method: 'POST',
    body: fd,
  });

  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as {
      error?: string;
      budgetBlocked?: boolean;
      supportEmail?: string | null;
      spentUsd?: number;
      budgetUsd?: number | null;
    };
    const detail =
      res.status === 402 && j.budgetBlocked
        ? {
            supportEmail: j.supportEmail ?? null,
            spentUsd: j.spentUsd ?? 0,
            budgetUsd: j.budgetUsd ?? null,
          }
        : undefined;
    throw new ReconcileError(j.error ?? `Error ${res.status}`, res.status, detail);
  }
  return res.json() as Promise<ReconciliationResponse>;
}
