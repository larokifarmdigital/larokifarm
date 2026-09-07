import type { MedicamentoInfo } from '@/core/domain/models/MedicamentoInfo';
import type {
  ProductFullInfoResult,
  ProductIdentifier,
  ProductIdentifierResult,
} from '@/core/domain/ports/ProductIdentifier';

/**
 * Adapter CIMA (AEMPS) — resuelve un CN de medicamento regulado a nombre + EAN,
 * y provee info detallada (principios activos, laboratorio, prospecto, ficha técnica).
 * Solo cubre medicamentos registrados en el Nomenclátor español; parafarmacia y
 * cosmética no aparecen y devuelven "no encontrado" (comportamiento esperado).
 *
 * Doc: https://cima.aemps.es/cima/rest/
 */
const BASE = 'https://cima.aemps.es/cima/rest';
const PROSPECTO_BASE = 'https://cima.aemps.es/cima/pdfs/es/p';
const FICHA_TECNICA_BASE = 'https://cima.aemps.es/cima/pdfs/es/ft';

interface CimaPrincipioActivo {
  nombre?: string;
  cantidad?: string;
  unidad?: string;
}

interface CimaVia {
  nombre?: string;
}

interface CimaLaboratorio {
  nombre?: string;
}

interface CimaFoto {
  url?: string;
  tipo?: string;
}

interface CimaMedicamento {
  nombre?: string;
  nregistro?: string;
  cn?: string;
  principiosActivos?: CimaPrincipioActivo[];
  vias?: CimaVia[];
  labtitular?: string | CimaLaboratorio;
  receta?: boolean;
  generico?: boolean;
  fotos?: CimaFoto[];
  presentaciones?: Array<{ codigoBarras?: string; nombre?: string }>;
}

async function fetchCima(cn: string): Promise<CimaMedicamento | null> {
  try {
    const url = `${BASE}/medicamento?cn=${encodeURIComponent(cn)}`;
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (!text) return null;
    return JSON.parse(text) as CimaMedicamento;
  } catch {
    return null;
  }
}

function formatPrincipiosActivos(pa?: CimaPrincipioActivo[]): string | undefined {
  if (!pa || pa.length === 0) return undefined;
  const parts = pa
    .map((p) => {
      const nombre = p.nombre?.trim();
      if (!nombre) return null;
      const dosis = [p.cantidad, p.unidad].filter(Boolean).join(' ').trim();
      return dosis ? `${nombre} ${dosis}` : nombre;
    })
    .filter((s): s is string => Boolean(s));
  return parts.length > 0 ? parts.join(' + ') : undefined;
}

function extractLaboratorio(lab: CimaMedicamento['labtitular']): string | undefined {
  if (!lab) return undefined;
  if (typeof lab === 'string') return lab.trim() || undefined;
  return lab.nombre?.trim() || undefined;
}

function extractVia(vias?: CimaVia[]): string | undefined {
  if (!vias || vias.length === 0) return undefined;
  return vias
    .map((v) => v.nombre?.trim())
    .filter(Boolean)
    .join(', ') || undefined;
}

async function lookupByCn(cn: string): Promise<ProductIdentifierResult> {
  const data = await fetchCima(cn);
  if (!data) return { ok: false, error: `CN ${cn} no encontrado en CIMA` };
  if (!data.nombre && !data.nregistro) {
    return { ok: false, error: `CN ${cn} no encontrado en CIMA` };
  }
  const ean = data.presentaciones?.find((p) => p.codigoBarras)?.codigoBarras;
  return { ok: true, nombre: data.nombre, ean };
}

async function getFullInfo(cn: string): Promise<ProductFullInfoResult> {
  const data = await fetchCima(cn);
  if (!data) return { ok: false, error: `CN ${cn} no encontrado en CIMA` };
  if (!data.nombre && !data.nregistro) {
    return { ok: false, error: `CN ${cn} no encontrado en CIMA` };
  }

  const ean = data.presentaciones?.find((p) => p.codigoBarras)?.codigoBarras;
  const info: MedicamentoInfo = {
    nombre: data.nombre ?? cn,
    nregistro: data.nregistro,
    cn: data.cn ?? cn,
    ean,
    principiosActivos: formatPrincipiosActivos(data.principiosActivos),
    laboratorio: extractLaboratorio(data.labtitular),
    viaAdministracion: extractVia(data.vias),
    necesitaReceta: typeof data.receta === 'boolean' ? data.receta : undefined,
    esGenerico: typeof data.generico === 'boolean' ? data.generico : undefined,
    prospectoUrl: data.nregistro ? `${PROSPECTO_BASE}/${data.nregistro}/Prospecto.pdf` : undefined,
    fichaTecnicaUrl: data.nregistro
      ? `${FICHA_TECNICA_BASE}/${data.nregistro}/FichaTecnica.pdf`
      : undefined,
    fotos: data.fotos?.map((f) => f.url).filter((u): u is string => Boolean(u)),
  };

  return { ok: true, info };
}

export const cimaProductIdentifier: ProductIdentifier = {
  lookupByCn,
  getFullInfo,
};
