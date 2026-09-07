'use server';

import type { MedicamentoInfo } from '@/core/domain/models/MedicamentoInfo';
import { productionDeps } from '@/core/composition';

/**
 * Server Action: obtiene info detallada de un medicamento por CN vía CIMA.
 * Se llama on-demand desde la UI cuando el usuario ya tiene un CN en el input
 * o cuando el use case comparePrice detectó un CN en el reporte.
 */
export async function fetchCimaInfoAction(
  cn: string,
): Promise<{ ok: true; info: MedicamentoInfo } | { ok: false; error: string }> {
  const clean = cn.replace(/\s|-/g, '').trim();
  if (!/^\d{6,7}$/.test(clean)) {
    return { ok: false, error: 'CN inválido: debe tener 6 o 7 dígitos.' };
  }
  return productionDeps.productIdentifier.getFullInfo(clean);
}
