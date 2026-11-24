import { Prisma, type PriceListRunStatus, type PriceProductType } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import type { Ejecucion, EstadoEjecucion, FilaLista, FilaResultado, FiltroResultado, ListaResumen } from '../domain/lista';
import type { TipoProducto } from '../domain/models';

const ESTADO_DE_DB: Record<PriceListRunStatus, EstadoEjecucion> = {
  QUEUED: 'en_cola',
  RUNNING: 'comparando',
  DONE: 'terminada',
  FAILED: 'con_error',
  CANCELLED: 'cancelada',
};
const TIPO_DE_DB: Record<PriceProductType, TipoProducto> = { RECETA: 'receta', SIN_RECETA: 'sin_receta', PARAFARMACIA: 'parafarmacia' };

const SELECT_RUN = {
  id: true,
  status: true,
  total: true,
  done: true,
  verified: true,
  errorReason: true,
  createdAt: true,
  startedAt: true,
  finishedAt: true,
  heartbeatAt: true,
  user: { select: { name: true } },
} satisfies Prisma.PriceListRunSelect;

function ejecucion(r: Prisma.PriceListRunGetPayload<{ select: typeof SELECT_RUN }>): Ejecucion {
  return {
    id: r.id,
    estado: ESTADO_DE_DB[r.status],
    total: r.total,
    hechos: r.done,
    conPrecio: r.verified,
    error: r.errorReason,
    creadaEn: r.createdAt.toISOString(),
    empezadaEn: r.startedAt?.toISOString() ?? null,
    terminadaEn: r.finishedAt?.toISOString() ?? null,
    latidoEn: r.heartbeatAt?.toISOString() ?? null,
    autor: r.user.name,
  };
}

const SELECT_LISTA = {
  id: true,
  name: true,
  fileName: true,
  itemCount: true,
  createdAt: true,
  user: { select: { name: true } },
  runs: { select: SELECT_RUN, orderBy: { createdAt: 'desc' as const }, take: 1 },
} satisfies Prisma.PriceListSelect;

function resumen(l: Prisma.PriceListGetPayload<{ select: typeof SELECT_LISTA }>): ListaResumen {
  return {
    id: l.id,
    nombre: l.name,
    archivo: l.fileName,
    productos: l.itemCount,
    creadaEn: l.createdAt.toISOString(),
    autor: l.user.name,
    ultima: l.runs[0] ? ejecucion(l.runs[0]) : null,
  };
}

const VERIFICADA = { status: 'VERIFIED' as const, price: { not: null } };

function whereResultados(runId: string, texto?: string, filtro?: FiltroResultado): Prisma.PriceListRunItemWhereInput {
  const t = texto?.trim();
  return {
    runId,
    ...(t
      ? {
          OR: [
            { item: { cn: { startsWith: t } } },
            { item: { name: { contains: t, mode: 'insensitive' } } },
            { check: { productName: { contains: t, mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...(filtro === 'con_precio' ? { check: { offers: { some: VERIFICADA } } } : {}),
    ...(filtro === 'sin_precio' ? { status: 'DONE', check: { productType: { not: 'RECETA' }, offers: { none: VERIFICADA } } } : {}),
    ...(filtro === 'receta' ? { check: { productType: 'RECETA' } } : {}),
    ...(filtro === 'pendiente' ? { status: { in: ['PENDING', 'ERROR'] } } : {}),
  };
}

const SELECT_RESULTADO = {
  status: true,
  reused: true,
  checkId: true,
  item: { select: { position: true, cn: true, name: true } },
  check: {
    select: {
      productName: true,
      productType: true,
      ean: true,
      officialPrice: true,
      createdAt: true,
      offers: { select: { pharmacy: true, status: true, price: true, url: true } },
    },
  },
} satisfies Prisma.PriceListRunItemSelect;

function fila(r: Prisma.PriceListRunItemGetPayload<{ select: typeof SELECT_RESULTADO }>, conPorFarmacia: boolean): FilaResultado {
  const verificadas = (r.check?.offers ?? []).filter((o) => o.status === 'VERIFIED' && o.price != null).sort((a, b) => Number(a.price) - Number(b.price));
  const mejor = verificadas[0];
  return {
    posicion: r.item.position,
    cn: r.item.cn,
    nombreExcel: r.item.name,
    estado: r.status === 'DONE' ? 'hecho' : r.status === 'ERROR' ? 'error' : 'pendiente',
    reutilizado: r.reused,
    checkId: r.checkId,
    producto: r.check ? { nombre: r.check.productName, tipo: TIPO_DE_DB[r.check.productType], ean: r.check.ean } : null,
    precioOficial: r.check?.officialPrice != null ? Number(r.check.officialPrice) : null,
    mejorPrecio: mejor ? Number(mejor.price) : null,
    mejorFarmacia: mejor?.pharmacy ?? null,
    mejorUrl: mejor?.url ?? null,
    conPrecio: verificadas.length,
    consultadas: r.check?.offers.length ?? 0,
    consultadoEn: r.check?.createdAt.toISOString() ?? null,
    ...(conPorFarmacia
      ? { porFarmacia: Object.fromEntries((r.check?.offers ?? []).map((o) => [o.pharmacy, o.status === 'VERIFIED' && o.price != null ? Number(o.price) : null])) }
      : {}),
  };
}

export class ListaActivaError extends Error {
  constructor() {
    super('Esta lista ya se está comparando.');
  }
}

export class PriceListRepositoryPrisma {
  async crear(input: { userId: string; nombre: string; archivo: string; filas: FilaLista[] }): Promise<string> {
    return prisma.$transaction(async (tx) => {
      const l = await tx.priceList.create({
        data: { userId: input.userId, name: input.nombre.slice(0, 120), fileName: input.archivo.slice(0, 200), itemCount: input.filas.length },
        select: { id: true },
      });
      await tx.priceListItem.createMany({
        data: input.filas.map((f, i) => ({ listId: l.id, position: i + 1, cn: f.cn, ean: f.ean, name: f.nombre })),
      });
      return l.id;
    });
  }

  async listar(): Promise<ListaResumen[]> {
    const ls = await prisma.priceList.findMany({ select: SELECT_LISTA, orderBy: { createdAt: 'desc' } });
    return ls.map(resumen);
  }

  async obtener(id: string): Promise<{ lista: ListaResumen; ejecuciones: Ejecucion[] } | null> {
    const l = await prisma.priceList.findUnique({ where: { id }, select: SELECT_LISTA });
    if (!l) return null;
    const runs = await prisma.priceListRun.findMany({ where: { listId: id }, select: SELECT_RUN, orderBy: { createdAt: 'desc' }, take: 20 });
    return { lista: resumen(l), ejecuciones: runs.map(ejecucion) };
  }

  async ejecucion(runId: string): Promise<(Ejecucion & { listaId: string }) | null> {
    const r = await prisma.priceListRun.findUnique({ where: { id: runId }, select: { ...SELECT_RUN, listId: true } });
    return r ? { ...ejecucion(r), listaId: r.listId } : null;
  }

  async renombrar(id: string, nombre: string): Promise<void> {
    await prisma.priceList.update({ where: { id }, data: { name: nombre.slice(0, 120) } });
  }

  async eliminar(id: string): Promise<void> {
    await prisma.priceList.delete({ where: { id } });
  }

  /** Nueva ejecución con todos los productos pendientes. Una sola activa por lista. */
  async crearEjecucion(listId: string, userId: string, activaSi: (e: Ejecucion) => boolean): Promise<string> {
    return prisma.$transaction(
      async (tx) => {
        const activas = await tx.priceListRun.findMany({ where: { listId, status: { in: ['QUEUED', 'RUNNING'] } }, select: SELECT_RUN });
        if (activas.some((a) => activaSi(ejecucion(a)))) throw new ListaActivaError();
        // Las que se quedaron colgadas se cierran antes de empezar otra.
        if (activas.length) {
          await tx.priceListRun.updateMany({
            where: { id: { in: activas.map((a) => a.id) } },
            data: { status: 'FAILED', errorReason: 'El proceso se detuvo', finishedAt: new Date() },
          });
        }
        const items = await tx.priceListItem.findMany({ where: { listId }, select: { id: true } });
        const run = await tx.priceListRun.create({ data: { listId, userId, total: items.length }, select: { id: true } });
        await tx.priceListRunItem.createMany({ data: items.map((it) => ({ runId: run.id, itemId: it.id })) });
        return run.id;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 },
    );
  }

  async cancelar(runId: string): Promise<boolean> {
    const r = await prisma.priceListRun.updateMany({
      where: { id: runId, status: { in: ['QUEUED', 'RUNNING'] } },
      data: { status: 'CANCELLED', finishedAt: new Date() },
    });
    return r.count > 0;
  }

  /** Vuelve a poner en cola una ejecución detenida (sigue con lo pendiente). */
  async reanudar(runId: string): Promise<boolean> {
    const r = await prisma.priceListRun.updateMany({
      where: { id: runId, status: { in: ['RUNNING', 'FAILED', 'CANCELLED'] } },
      data: { status: 'QUEUED', errorReason: null, finishedAt: null, heartbeatAt: null },
    });
    if (r.count) await prisma.priceListRunItem.updateMany({ where: { runId, status: 'ERROR' }, data: { status: 'PENDING', error: null } });
    return r.count > 0;
  }

  async resultados(runId: string, opts: { pagina: number; porPagina: number; texto?: string; filtro?: FiltroResultado }) {
    const where = whereResultados(runId, opts.texto, opts.filtro);
    const [filas, total] = await Promise.all([
      prisma.priceListRunItem.findMany({
        where,
        select: SELECT_RESULTADO,
        orderBy: { item: { position: 'asc' } },
        skip: (opts.pagina - 1) * opts.porPagina,
        take: opts.porPagina,
      }),
      prisma.priceListRunItem.count({ where }),
    ]);
    return { items: filas.map((f) => fila(f, false)), total };
  }

  /** Todo, con el precio de cada farmacia, para el Excel. */
  async todosResultados(runId: string): Promise<FilaResultado[]> {
    const filas = await prisma.priceListRunItem.findMany({ where: { runId }, select: SELECT_RESULTADO, orderBy: { item: { position: 'asc' } } });
    return filas.map((f) => fila(f, true));
  }

  /** Cuántos de estos CN ya tienen consulta en las últimas `msMax` (no se volverán a buscar). */
  async cuantosRecientes(cns: string[], msMax: number): Promise<number> {
    if (cns.length === 0) return 0;
    const r = await prisma.priceCheck.findMany({
      where: { cn: { in: cns }, createdAt: { gte: new Date(Date.now() - msMax) } },
      select: { cn: true },
      distinct: ['cn'],
    });
    return r.length;
  }

  async cnsDeLista(listId: string): Promise<string[]> {
    return (await prisma.priceListItem.findMany({ where: { listId }, select: { cn: true } })).map((i) => i.cn);
  }

  // ── Para el proceso de fondo ──────────────────────────────────────────

  async empezar(runId: string): Promise<{ estado: EstadoEjecucion; userId: string } | null> {
    const r = await prisma.priceListRun.findUnique({ where: { id: runId }, select: { status: true, userId: true } });
    if (!r) return null;
    if (r.status === 'QUEUED') {
      await prisma.priceListRun.update({ where: { id: runId }, data: { status: 'RUNNING', startedAt: new Date(), heartbeatAt: new Date() } });
      return { estado: 'comparando', userId: r.userId };
    }
    return { estado: ESTADO_DE_DB[r.status], userId: r.userId };
  }

  async pendientes(runId: string, n: number) {
    return prisma.priceListRunItem.findMany({
      where: { runId, status: 'PENDING' },
      select: { id: true, item: { select: { cn: true, ean: true, name: true } } },
      orderBy: { item: { position: 'asc' } },
      take: n,
    });
  }

  async marcarHecho(runItemId: string, runId: string, checkId: string, reutilizado: boolean, conPrecio: boolean) {
    await prisma.$transaction([
      prisma.priceListRunItem.update({ where: { id: runItemId }, data: { status: 'DONE', checkId, reused: reutilizado } }),
      prisma.priceListRun.update({
        where: { id: runId },
        data: { done: { increment: 1 }, verified: { increment: conPrecio ? 1 : 0 }, heartbeatAt: new Date() },
      }),
    ]);
  }

  async marcarError(runItemId: string, runId: string, error: string) {
    await prisma.$transaction([
      prisma.priceListRunItem.update({ where: { id: runItemId }, data: { status: 'ERROR', error: error.slice(0, 300) } }),
      prisma.priceListRun.update({ where: { id: runId }, data: { done: { increment: 1 }, heartbeatAt: new Date() } }),
    ]);
  }

  /** Recalcula los contadores a partir de los productos (se llama al empezar y al terminar). */
  async recontar(runId: string) {
    const [done, verified] = await Promise.all([
      prisma.priceListRunItem.count({ where: { runId, status: { in: ['DONE', 'ERROR'] } } }),
      prisma.priceListRunItem.count({ where: { runId, status: 'DONE', check: { offers: { some: VERIFICADA } } } }),
    ]);
    await prisma.priceListRun.update({ where: { id: runId }, data: { done, verified } });
  }

  async estado(runId: string): Promise<EstadoEjecucion | null> {
    const r = await prisma.priceListRun.findUnique({ where: { id: runId }, select: { status: true } });
    return r ? ESTADO_DE_DB[r.status] : null;
  }

  async latido(runId: string) {
    await prisma.priceListRun.updateMany({ where: { id: runId, status: 'RUNNING' }, data: { heartbeatAt: new Date() } });
  }

  async terminar(runId: string, error?: string) {
    await prisma.priceListRun.updateMany({
      where: { id: runId, status: 'RUNNING' },
      data: { status: error ? 'FAILED' : 'DONE', errorReason: error?.slice(0, 300) ?? null, finishedAt: new Date() },
    });
  }

  /**
   * Consulta reciente y completa del mismo CN (para no repetirla): de las
   * últimas `msMax` y con respuesta de todas las farmacias que tocaba.
   */
  async consultaReciente(cn: string, msMax: number, farmaciasEsperadas: (tipo: TipoProducto) => number) {
    const cs = await prisma.priceCheck.findMany({
      where: { cn, createdAt: { gte: new Date(Date.now() - msMax) } },
      select: { id: true, productType: true, offers: { select: { status: true, price: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    const c = cs.find((x) => x.offers.length >= farmaciasEsperadas(TIPO_DE_DB[x.productType]));
    return c ? { id: c.id, conPrecio: c.offers.some((o) => o.status === 'VERIFIED' && o.price != null) } : null;
  }
}
