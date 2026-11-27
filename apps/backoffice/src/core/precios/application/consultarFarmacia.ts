import type { Oferta, TipoProducto } from '../domain/models';
import type { AdaptadorFarmacia, PriceCheckRepository } from '../domain/ports';

/** Una consulta solo admite resultados de farmacias durante un rato (no se reabre días después). */
export const VENTANA_CONSULTA_MS = 10 * 60 * 1000;

export type ResultadoConsultaFarmacia = { ok: true; oferta: Oferta } | { ok: false; error: string; status: number };

export async function consultarFarmacia(
  checkId: string,
  clave: string,
  deps: {
    repo: PriceCheckRepository;
    farmaciaPorClave: (clave: string) => AdaptadorFarmacia | undefined;
    farmaciasPara: (tipo: TipoProducto) => readonly AdaptadorFarmacia[];
  },
): Promise<ResultadoConsultaFarmacia> {
  const farmacia = deps.farmaciaPorClave(clave);
  const c = farmacia ? await deps.repo.obtener(checkId) : null;
  if (!farmacia || !c) return { ok: false, error: 'Esa consulta ya no existe.', status: 404 };
  if (Date.now() - new Date(c.creadaEn).getTime() > VENTANA_CONSULTA_MS || !deps.farmaciasPara(c.producto.tipo).includes(farmacia)) {
    return { ok: false, error: 'Esta consulta ya está cerrada. Vuelve a consultar.', status: 409 };
  }
  const r = await farmacia.buscar(c.producto);
  const oferta: Oferta = { ...r, farmacia: farmacia.clave, consultadoEn: new Date().toISOString() };
  await deps.repo.guardarOferta(checkId, oferta);
  return { ok: true, oferta };
}
