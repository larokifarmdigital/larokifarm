import { searchAllPharmaciesViaGemini } from '../infrastructure/geminiSearch';
import type { ComparisonReport } from '../domain/models';
import { resolveInput, type ResolveInputArgs } from './normalizeIdentifier';

export type CompareInput = ResolveInputArgs;

export type CompareUseCaseResult =
  | { ok: true; report: ComparisonReport }
  | { ok: false; error: string };

export async function comparePriceUseCase(input: CompareInput): Promise<CompareUseCaseResult> {
  const t0 = Date.now();
  const normalized = await resolveInput(input);
  if (!normalized.ok) return { ok: false, error: normalized.error };

  const { product, rows } = await searchAllPharmaciesViaGemini({
    cn: normalized.input.cn,
    ean: normalized.input.ean,
    nombre: normalized.input.nombre,
  });

  return {
    ok: true,
    report: {
      input: normalized.input,
      product,
      rows,
      totalMs: Date.now() - t0,
    },
  };
}
