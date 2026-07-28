import { lookupByCn } from '../infrastructure/cima';
import type { NormalizedInput } from '../domain/models';

export type ResolveInputArgs = {
  cn?: string;
  ean?: string;
  nombre?: string;
};

export type NormalizeResult =
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
 *  - CN se intenta resolver contra CIMA (medicamentos regulados) para enriquecer con EAN + nombre.
 *    - Si CIMA lo encuentra → usa esos datos como fallback.
 *    - Si CIMA NO lo encuentra (típico de parafarmacia/cosmética) → NO falla; el CN se usa
 *      directamente como término de búsqueda en las farmacias (muchas indexan por CN).
 *  - Si el user pasa EAN además del CN → prevalece el EAN del user (fuente comercial).
 *  - Si el user pasa Nombre además del CN → prevalece el Nombre del user.
 *  - Nombre solo (sin códigos) es válido: se busca por nombre en cada farmacia.
 *  - EAN solo (sin nombre): funciona pero muchas farmacias no indexan por EAN.
 */
export async function resolveInput(args: ResolveInputArgs): Promise<NormalizeResult> {
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

  // Intento CIMA (best-effort): si el CN es de medicamento regulado, obtengo nombre + EAN.
  // Si el CN es de parafarmacia/cosmética (no en CIMA), no fallo — se buscará por CN directo.
  let cimaEan: string | undefined;
  let cimaNombre: string | undefined;
  if (cn) {
    const lookup = await lookupByCn(cn);
    if (lookup.ok) {
      cimaEan = lookup.ean;
      cimaNombre = lookup.nombre;
    }
  }

  // Prioridad: input explícito del usuario > CIMA > el propio CN como último recurso
  const finalEan = ean ?? cimaEan;
  // Si no hay nombre ni de CIMA ni del user, y sí hay CN, usamos el CN como query textual.
  // Los buscadores de las farmacias tratan cualquier texto como término de búsqueda y muchas
  // (Sarasketa, Fuentelucha, DosFarma…) sí indexan productos por su CN.
  const finalNombre = nombreHint ?? cimaNombre ?? cn;

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

// Alias legacy — mantiene el import viejo de un solo identificador funcionando.
// Deprecar cuando ya no queden usos.
export async function normalizeIdentifier(
  raw: string,
  nombreHint?: string,
): Promise<NormalizeResult> {
  const clean = raw.replace(/\s|-/g, '').trim();
  if (!ONLY_DIGITS.test(clean)) {
    return { ok: false, error: 'El identificador solo puede contener dígitos.' };
  }
  if (clean.length === 13) return resolveInput({ ean: clean, nombre: nombreHint });
  if (clean.length === 6 || clean.length === 7) return resolveInput({ cn: clean, nombre: nombreHint });
  return {
    ok: false,
    error: `Longitud inválida (${clean.length}). Usá EAN de 13 dígitos o CN de 6-7 dígitos.`,
  };
}
