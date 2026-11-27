import type { ReconciliationResponse } from '@/core/engine';

export interface PairToSend {
  label: string;
  /** 1..N PDFs del MISMO envío (albarán + factura…). Se juntan en el servidor. */
  pdfs: File[];
  /** 1 or N Excels del mismo pedido. Se concatenan server-side antes de conciliar. */
  xlsxs: File[];
}

export interface BudgetBlockedDetail {
  supportEmail: string | null;
  spentUsd: number;
  budgetUsd: number | null;
}

/** Error de API que conserva el status HTTP (para distinguir 401). */
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

export async function reconcilePairs(
  pairs: PairToSend[],
  /** Obligatoria si el usuario lleva varias farmacias (el servidor la valida). */
  farmaciaId?: string,
): Promise<ReconciliationResponse> {
  const fd = new FormData();
  pairs.forEach((p, i) => {
    for (const pdf of p.pdfs) fd.append(`pdfs_${i}`, pdf);
    for (const xlsx of p.xlsxs) fd.append(`xlsxs_${i}`, xlsx);
    fd.append(`label_${i}`, p.label);
  });

  const url = farmaciaId ? `/api/conciliar?farmacia=${encodeURIComponent(farmaciaId)}` : '/api/conciliar';
  const res = await fetch(url, {
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
