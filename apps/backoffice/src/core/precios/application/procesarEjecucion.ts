// Proceso de fondo de una lista (lo ejecuta GitHub Actions con scripts/procesar-lista.ts).
// Cola continua de productos, varios a la vez; cada web sigue con su límite de
// 1 petición/s (ClienteWeb hace cola por web). Se puede cortar y reanudar: solo
// procesa lo que siga PENDIENTE. NUNCA escribe productos ni precios en el log
// (los registros de GitHub Actions de un repo público son públicos).
import { eanDeCn } from '../domain/codigos';
import type { Oferta, Producto } from '../domain/models';
import type { AdaptadorFarmacia, CatalogoMedicamentos, PrecioOficialPort, PriceCheckRepository } from '../domain/ports';
import type { PriceListRepositoryPrisma } from '../infrastructure/PriceListRepositoryPrisma';
import type { TipoProducto } from '../domain/models';

export const REUTILIZAR_MS = 24 * 60 * 60 * 1000;
/** Productos en curso a la vez (cada web sigue a 1 petición/s con su propia cola). */
const A_LA_VEZ = 20;
const COMPROBAR_CANCELACION_MS = 5_000;

export interface DepsProceso {
  listas: PriceListRepositoryPrisma;
  consultas: PriceCheckRepository;
  medicamentos: CatalogoMedicamentos;
  precioOficial: PrecioOficialPort;
  farmaciasPara: (tipo: TipoProducto) => readonly AdaptadorFarmacia[];
  registrarUso: (userId: string, farmacias: number) => Promise<void>;
  log: (msg: string) => void;
}

/** Con CN: CIMA si es medicamento; si no, parafarmacia con el nombre del Excel. */
async function identificar(cn: string, nombreExcel: string | null, eanExcel: string | null, deps: DepsProceso): Promise<Producto> {
  const med = await deps.medicamentos.porCn(cn);
  if (med) return { cn, ean: eanDeCn(cn), nombre: med.nombre, tipo: med.tipo };
  return { cn, ean: eanExcel, nombre: nombreExcel || `CN ${cn}`, tipo: 'parafarmacia' };
}

async function procesarUno(
  runId: string,
  userId: string,
  ri: { id: string; item: { cn: string; ean: string | null; name: string | null } },
  deps: DepsProceso,
) {
  const reciente = await deps.listas.consultaReciente(ri.item.cn, REUTILIZAR_MS, (t) => deps.farmaciasPara(t).length);
  if (reciente) return deps.listas.marcarHecho(ri.id, runId, reciente.id, true, reciente.conPrecio);
  const producto = await identificar(ri.item.cn, ri.item.name, ri.item.ean, deps);
  const precioOficial = producto.tipo === 'receta' ? await deps.precioOficial.deCn(producto.cn) : null;
  const checkId = await deps.consultas.crear({ userId, consulta: `Lista: ${producto.cn}`, producto, precioOficial, desdeLista: true });
  const farmacias = deps.farmaciasPara(producto.tipo);
  const ofertas = await Promise.all(
    farmacias.map(async (f) => {
      const r = await f.buscar(producto);
      const o: Oferta = { ...r, farmacia: f.clave, consultadoEn: new Date().toISOString() };
      await deps.consultas.guardarOferta(checkId, o);
      return o;
    }),
  );
  await deps.registrarUso(userId, farmacias.length);
  await deps.listas.marcarHecho(ri.id, runId, checkId, false, ofertas.some((o) => o.estado === 'verificado' && o.precio != null));
}

export async function procesarEjecucion(runId: string, deps: DepsProceso): Promise<void> {
  const inicio = await deps.listas.empezar(runId);
  if (!inicio) return deps.log('La ejecución no existe');
  if (inicio.estado !== 'comparando') return deps.log(`Nada que hacer (estado: ${inicio.estado})`);
  await deps.listas.recontar(runId);
  let hechos = 0;
  let errores = 0;
  let cancelada = false;
  const cola: Awaited<ReturnType<DepsProceso['listas']['pendientes']>> = [];
  const vistos = new Set<string>(); // en cola o en curso: nunca dos veces el mismo
  let recarga: Promise<number> | null = null;
  // Cola continua (no por tandas): en cuanto un producto acaba entra el siguiente,
  // así ninguna web se queda parada esperando a la más lenta de una tanda.
  // UNA sola recarga a la vez: si no, cada trabajador metía el mismo lote.
  function recargar(): Promise<number> {
    recarga ??= (async () => {
      if ((await deps.listas.estado(runId)) !== 'comparando') {
        cancelada = true;
        return 0;
      }
      const lote = (await deps.listas.pendientes(runId, A_LA_VEZ * 4 + vistos.size)).filter((ri) => !vistos.has(ri.id));
      for (const ri of lote) vistos.add(ri.id);
      cola.push(...lote);
      await deps.listas.latido(runId);
      return lote.length;
    })().finally(() => {
      recarga = null;
    });
    return recarga;
  }
  // Cancelar se nota en ≤ 5 s aunque la cola tenga productos (los ya empezados terminan).
  let comprobada = Date.now();
  async function siguiente(): Promise<(typeof cola)[number] | null> {
    if (!cancelada && Date.now() - comprobada > COMPROBAR_CANCELACION_MS) {
      comprobada = Date.now();
      if ((await deps.listas.estado(runId)) !== 'comparando') cancelada = true;
    }
    while (cola.length === 0 && !cancelada) {
      if ((await recargar()) === 0 && cola.length === 0) return null;
    }
    return cancelada ? null : (cola.shift() ?? null);
  }
  async function trabajador() {
    for (let ri = await siguiente(); ri; ri = await siguiente()) {
      await procesarUno(runId, inicio!.userId, ri, deps).catch(async (e) => {
        errores++;
        await deps.listas.marcarError(ri!.id, runId, (e as Error).message ?? String(e));
      });
      vistos.delete(ri.id);
      if (++hechos % 25 === 0) deps.log(`Procesados ${hechos} (errores: ${errores})`);
    }
  }
  try {
    await Promise.all(Array.from({ length: A_LA_VEZ }, trabajador));
    await deps.listas.recontar(runId);
    if (cancelada) return deps.log(`Cancelada tras ${hechos} productos`);
    await deps.listas.terminar(runId);
    deps.log(`Terminada: ${hechos} productos, ${errores} con error`);
  } catch (e) {
    // Solo el tipo de error: el mensaje podría llevar datos de la consulta.
    deps.log(`Fallo general: ${(e as Error).name}`);
    await deps.listas.terminar(runId, 'El proceso se detuvo por un error. Puedes reanudarlo.');
    throw e;
  }
}
