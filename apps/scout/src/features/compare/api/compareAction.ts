'use server';

import { comparePriceUseCase, type CompareUseCaseResult } from '../application/comparePriceUseCase';

export type CompareActionState =
  | { status: 'idle' }
  | { status: 'error'; error: string }
  | { status: 'done'; result: Extract<CompareUseCaseResult, { ok: true }>['report'] };

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

  const result = await comparePriceUseCase({ cn, ean, nombre });
  if (!result.ok) return { status: 'error', error: result.error };

  return { status: 'done', result: result.report };
}
