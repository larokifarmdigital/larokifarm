import type {
  ProductIdentifier,
  ProductIdentifierResult,
} from '@/core/domain/ports/ProductIdentifier';

/**
 * Adapter CIMA (AEMPS) — resuelve un CN de medicamento regulado a nombre + EAN.
 * Solo cubre medicamentos registrados en el Nomenclátor español; parafarmacia
 * y cosmética no aparecen y devuelven "no encontrado" (comportamiento esperado).
 */
const BASE = 'https://cima.aemps.es/cima/rest';

interface CimaMedicamento {
  nombre?: string;
  nregistro?: string;
  cn?: string;
  presentaciones?: Array<{ codigoBarras?: string }>;
}

async function lookupByCn(cn: string): Promise<ProductIdentifierResult> {
  try {
    const url = `${BASE}/medicamento?cn=${encodeURIComponent(cn)}`;
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, error: `CIMA HTTP ${res.status}` };

    const text = (await res.text()).trim();
    if (!text) return { ok: false, error: `CN ${cn} no encontrado en CIMA` };

    let data: CimaMedicamento;
    try {
      data = JSON.parse(text) as CimaMedicamento;
    } catch {
      return { ok: false, error: `CIMA devolvió una respuesta no JSON para CN ${cn}` };
    }

    if (!data.nombre && !data.nregistro) {
      return { ok: false, error: `CN ${cn} no encontrado en CIMA` };
    }

    const ean = data.presentaciones?.find((p) => p.codigoBarras)?.codigoBarras;
    return { ok: true, nombre: data.nombre, ean };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export const cimaProductIdentifier: ProductIdentifier = {
  lookupByCn,
};
