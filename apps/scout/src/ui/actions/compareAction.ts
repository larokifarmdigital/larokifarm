'use server';

import { comparePrice, type ComparePriceResult } from '@/core/application/comparePrice';
import { productionDeps } from '@/core/composition';

/**
 * Server Action: bridge entre el form del cliente y el use case comparePrice.
 * Aquí ocurre la inyección de las dependencias de infraestructura vía el composition root.
 * Nota: maxDuration (60s) se declara en app/page.tsx — no se puede exportar constantes
 * desde archivos 'use server' en Next 16.
 */
export type CompareActionState =
  | { status: 'idle' }
  | { status: 'error'; error: string }
  | { status: 'done'; result: Extract<ComparePriceResult, { ok: true }>['report'] };

function readOptional(formData: FormData, key: string): string | undefined {
  const raw = String(formData.get(key) ?? '').trim();
  return raw || undefined;
}

export async function compareAction(
  _prev: CompareActionState,
  formData: FormData,
): Promise<CompareActionState> {
  const cn = readOptional(formData, 'cn');
  const ean = readOptional(formData, 'ean');
  const nombre = readOptional(formData, 'nombre');

  if (!cn && !ean && !nombre) {
    return { status: 'error', error: 'Ingresá al menos uno: CN, EAN o Nombre.' };
  }

  const result = await comparePrice({ cn, ean, nombre }, productionDeps);
  if (!result.ok) return { status: 'error', error: result.error };

  return { status: 'done', result: result.report };
}
