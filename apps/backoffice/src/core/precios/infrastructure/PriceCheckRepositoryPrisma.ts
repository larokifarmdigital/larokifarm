import { Prisma, type PriceOfferStatus, type PriceProductType } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import type { Consulta, ConsultaResumen, EstadoOferta, Oferta, TipoProducto } from '../domain/models';
import type { PriceCheckRepository } from '../domain/ports';

const TIPO_A_DB: Record<TipoProducto, PriceProductType> = { receta: 'RECETA', sin_receta: 'SIN_RECETA', parafarmacia: 'PARAFARMACIA' };
const TIPO_DE_DB: Record<PriceProductType, TipoProducto> = { RECETA: 'receta', SIN_RECETA: 'sin_receta', PARAFARMACIA: 'parafarmacia' };
const ESTADO_A_DB: Record<EstadoOferta, PriceOfferStatus> = {
  verificado: 'VERIFIED',
  sin_codigo: 'NO_CODE',
  no_encontrado: 'NOT_FOUND',
  bloquea: 'BLOCKED',
  error: 'ERROR',
};
const ESTADO_DE_DB = Object.fromEntries(Object.entries(ESTADO_A_DB).map(([k, v]) => [v, k])) as Record<PriceOfferStatus, EstadoOferta>;

const num = (d: Prisma.Decimal | null) => (d == null ? null : Number(d));

const SELECT = {
  id: true,
  query: true,
  cn: true,
  ean: true,
  productName: true,
  productType: true,
  officialPrice: true,
  createdAt: true,
  user: { select: { name: true } },
  offers: true,
} satisfies Prisma.PriceCheckSelect;

type Fila = Prisma.PriceCheckGetPayload<{ select: typeof SELECT }>;

function oferta(o: Fila['offers'][number]): Oferta {
  return {
    farmacia: o.pharmacy,
    estado: ESTADO_DE_DB[o.status],
    precio: num(o.price),
    precioAntes: num(o.previousPrice),
    url: o.url,
    nombreFicha: o.productName,
    nota: o.note,
    consultadoEn: o.checkedAt.toISOString(),
  };
}

function producto(f: Fila) {
  return { cn: f.cn, ean: f.ean, nombre: f.productName, tipo: TIPO_DE_DB[f.productType] };
}

export class PriceCheckRepositoryPrisma implements PriceCheckRepository {
  async crear(c: Parameters<PriceCheckRepository['crear']>[0]) {
    const r = await prisma.priceCheck.create({
      data: {
        userId: c.userId,
        query: c.consulta.slice(0, 200),
        cn: c.producto.cn,
        ean: c.producto.ean,
        productName: c.producto.nombre.slice(0, 300),
        productType: TIPO_A_DB[c.producto.tipo],
        officialPrice: c.precioOficial,
        fromList: c.desdeLista ?? false,
      },
      select: { id: true },
    });
    return r.id;
  }

  async guardarOferta(checkId: string, o: Oferta) {
    const data = {
      status: ESTADO_A_DB[o.estado],
      price: o.precio,
      previousPrice: o.precioAntes,
      url: o.url?.slice(0, 1000) ?? null,
      productName: o.nombreFicha?.slice(0, 300) ?? null,
      note: o.nota?.slice(0, 1000) ?? null,
      checkedAt: new Date(o.consultadoEn),
    };
    await prisma.priceOffer.upsert({
      where: { checkId_pharmacy: { checkId, pharmacy: o.farmacia } },
      create: { checkId, pharmacy: o.farmacia, ...data },
      update: data,
    });
  }

  async obtener(id: string): Promise<Consulta | null> {
    const f = await prisma.priceCheck.findUnique({ where: { id }, select: SELECT });
    if (!f) return null;
    return {
      id: f.id,
      consulta: f.query,
      producto: producto(f),
      precioOficial: num(f.officialPrice),
      creadaEn: f.createdAt.toISOString(),
      autor: f.user.name,
      ofertas: f.offers.map(oferta),
    };
  }

  async listar({ pagina, porPagina, texto, desde, hasta, resultado }: Parameters<PriceCheckRepository['listar']>[0]) {
    const t = texto?.trim();
    const verificada = { status: 'VERIFIED' as const, price: { not: null } };
    const where: Prisma.PriceCheckWhereInput = {
      fromList: false,
      ...(t ? { OR: [{ productName: { contains: t, mode: 'insensitive' } }, { cn: { startsWith: t } }, { ean: { startsWith: t } }] } : {}),
      ...(desde || hasta ? { createdAt: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lt: hasta } : {}) } } : {}),
      ...(resultado === 'con_precio' ? { offers: { some: verificada } } : {}),
      ...(resultado === 'sin_precio' ? { productType: { not: 'RECETA' }, offers: { none: verificada } } : {}),
      ...(resultado === 'receta' ? { productType: 'RECETA' } : {}),
    };
    const [filas, total] = await Promise.all([
      prisma.priceCheck.findMany({ where, select: SELECT, orderBy: { createdAt: 'desc' }, skip: (pagina - 1) * porPagina, take: porPagina }),
      prisma.priceCheck.count({ where }),
    ]);
    const items = filas.map((f): ConsultaResumen => {
      const verificados = f.offers.filter((o) => o.status === 'VERIFIED' && o.price != null).map((o) => Number(o.price));
      return {
        id: f.id,
        producto: producto(f),
        creadaEn: f.createdAt.toISOString(),
        autor: f.user.name,
        precioOficial: num(f.officialPrice),
        mejorPrecio: verificados.length ? Math.min(...verificados) : null,
        conPrecio: verificados.length,
        consultadas: f.offers.length,
      };
    });
    return { items, total };
  }
}
