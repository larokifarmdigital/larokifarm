import type { NormalizedInput } from '@/core/domain/models';
import type { ProductIdentifier } from '@/core/domain/ports/ProductIdentifier';

export type ResolveInputArgs = {
  cn?: string;
  ean?: string;
  nombre?: string;
};

export type ResolveInputResult =
  | { ok: true; input: NormalizedInput }
  | { ok: false; error: string };

const ONLY_DIGITS = /^\d+$/;

function cleanDigits(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const clean = raw.replace(/\s|-/g, '').trim();
  return clean || undefined;
}

/**
 * Normaliza los tres inputs opcionales (CN + EAN + Nombre) en un NormalizedInput.
 * Reglas:
 *  - Al menos uno de los tres debe estar presente.
 *  - CN se intenta resolver contra el ProductIdentifier (típicamente CIMA para medicamentos regulados)
 *    para enriquecer con EAN + nombre.
 *    - Si el identifier lo encuentra → usa esos datos como fallback.
 *    - Si NO lo encuentra (típico de parafarmacia/cosmética) → NO falla; el CN se usa
 *      directamente como término de búsqueda en las farmacias.
 *  - Si el user pasa EAN además del CN → prevalece el EAN del user (fuente comercial).
 *  - Si el user pasa Nombre además del CN → prevalece el Nombre del user.
 *  - Nombre solo (sin códigos) es válido.
 *  - EAN solo (sin nombre): funciona pero muchas farmacias no indexan por EAN.
 */
export async function resolveInput(
  args: ResolveInputArgs,
  productIdentifier: ProductIdentifier,
): Promise<ResolveInputResult> {
  const cn = cleanDigits(args.cn);
  const ean = cleanDigits(args.ean);
  const nombreHint = args.nombre?.trim() || undefined;

  if (!cn && !ean && !nombreHint) {
    return { ok: false, error: 'Ingresá al menos uno: CN, EAN o Nombre.' };
  }

  if (cn && !ONLY_DIGITS.test(cn)) {
    return { ok: false, error: 'El CN solo puede contener dígitos.' };
  }
  if (cn && cn.length !== 6 && cn.length !== 7) {
    return { ok: false, error: `CN debe tener 6 o 7 dígitos (recibido: ${cn.length}).` };
  }

  if (ean && !ONLY_DIGITS.test(ean)) {
    return { ok: false, error: 'El EAN solo puede contener dígitos.' };
  }
  if (ean && ean.length !== 13) {
    return { ok: false, error: `EAN debe tener 13 dígitos (recibido: ${ean.length}).` };
  }

  // Intento identificar el producto (best-effort). Si el CN es de parafarmacia y el
  // identifier no lo encuentra, no fallamos — se buscará por CN directo.
  let lookupEan: string | undefined;
  let lookupNombre: string | undefined;
  if (cn) {
    const lookup = await productIdentifier.lookupByCn(cn);
    if (lookup.ok) {
      lookupEan = lookup.ean;
      lookupNombre = lookup.nombre;
    }
  }

  const finalEan = ean ?? lookupEan;
  const finalNombre = nombreHint ?? lookupNombre ?? cn;

  if (!finalEan && !finalNombre) {
    return { ok: false, error: 'Sin datos suficientes para buscar.' };
  }

  const raw = [cn, ean, nombreHint].filter(Boolean).join(' + ');

  return {
    ok: true,
    input: {
      raw,
      ean: finalEan,
      nombre: finalNombre,
      nombreHint,
      origen: cn ? 'cn' : ean ? 'ean' : 'nombre',
      cn,
    },
  };
}
