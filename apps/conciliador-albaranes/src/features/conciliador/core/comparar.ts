import { limpiarCN, num } from './numeros';
import type {
  AlbaranData,
  Conciliacion,
  LineaConciliada,
  PedidoData,
  TipoDiscrepancia,
} from './tipos';

/** Tolerancias validadas (§9). */
export const TOL_UNIDADES = 0.001;
export const TOL_PRECIO = 0.01;
export const TOL_DESCUENTO = 0.01;

interface Agregado {
  cn: string;
  descripcion: string;
  uds: number;
  precio: number;
  dto: number;
}

/**
 * Agrupa líneas por C.N. normalizado. Si un mismo C.N. aparece varias veces,
 * suma las unidades y conserva el precio/descuento de la primera aparición
 * (caso poco habitual; el informe muestra una fila por C.N.).
 */
function agrupar(
  filas: Array<{ cnRaw: unknown; descripcion: string; uds: unknown; precio: unknown; dto: unknown }>,
): Map<string, Agregado> {
  const mapa = new Map<string, Agregado>();
  for (const f of filas) {
    const cn = limpiarCN(f.cnRaw);
    if (!cn) continue;
    const existente = mapa.get(cn);
    if (existente) {
      existente.uds += num(f.uds);
      if (!existente.descripcion) existente.descripcion = f.descripcion;
    } else {
      mapa.set(cn, {
        cn,
        descripcion: f.descripcion ?? '',
        uds: num(f.uds),
        precio: num(f.precio),
        dto: num(f.dto),
      });
    }
  }
  return mapa;
}

/**
 * Concilia un albarán contra su pedido. La clave de cruce es el C.N. normalizado
 * a 6 dígitos. Devuelve una fila por cada C.N. de la unión pedido ∪ albarán.
 */
export function conciliar(albaran: AlbaranData, pedido: PedidoData): Conciliacion {
  const pedidoPorCN = agrupar(
    pedido.lineas.map((l) => ({
      cnRaw: l.codigoArticulo,
      descripcion: l.descripcion ?? '',
      uds: l.unidades,
      precio: l.precio,
      dto: l.descuento,
    })),
  );

  const albaranPorCN = agrupar(
    albaran.lineas.map((l) => ({
      cnRaw: l.codigo_nacional || l.codigo || '',
      descripcion: l.descripcion ?? '',
      uds: l.cantidad,
      precio: l.precio_unitario,
      dto: l.descuento ?? 0,
    })),
  );

  const todosCN = new Set<string>([...pedidoPorCN.keys(), ...albaranPorCN.keys()]);
  const lineas: LineaConciliada[] = [];

  for (const cn of todosCN) {
    const p = pedidoPorCN.get(cn);
    const a = albaranPorCN.get(cn);

    if (p && a) {
      const discrepancias: TipoDiscrepancia[] = [];
      if (Math.abs(p.uds - a.uds) > TOL_UNIDADES) discrepancias.push('unidades');
      if (Math.abs(p.precio - a.precio) > TOL_PRECIO) discrepancias.push('precio');
      if (Math.abs(p.dto - a.dto) > TOL_DESCUENTO) discrepancias.push('descuento');

      lineas.push({
        cn,
        descripcion: a.descripcion || p.descripcion,
        udsPedido: p.uds,
        udsAlbaran: a.uds,
        precioPedido: p.precio,
        precioAlbaran: a.precio,
        dtoPedido: p.dto,
        dtoAlbaran: a.dto,
        estado: discrepancias.length === 0 ? 'OK' : 'DISCREPANCIA',
        discrepancias,
      });
    } else if (p && !a) {
      lineas.push({
        cn,
        descripcion: p.descripcion,
        udsPedido: p.uds,
        udsAlbaran: null,
        precioPedido: p.precio,
        precioAlbaran: null,
        dtoPedido: p.dto,
        dtoAlbaran: null,
        estado: 'FALTA_EN_ALBARAN',
        discrepancias: [],
      });
    } else if (a) {
      lineas.push({
        cn,
        descripcion: a.descripcion,
        udsPedido: null,
        udsAlbaran: a.uds,
        precioPedido: null,
        precioAlbaran: a.precio,
        dtoPedido: null,
        dtoAlbaran: a.dto,
        estado: 'SOBRA_EN_ALBARAN',
        discrepancias: [],
      });
    }
  }

  // Orden estable: primero las que tienen problema, luego por C.N.
  lineas.sort((x, y) => {
    const px = x.estado === 'OK' ? 1 : 0;
    const py = y.estado === 'OK' ? 1 : 0;
    if (px !== py) return px - py;
    return x.cn.localeCompare(y.cn);
  });

  const totalDiscrepancias = lineas.filter((l) => l.estado !== 'OK').length;

  return {
    numeroAlbaran: albaran.numero_albaran,
    proveedor: albaran.proveedor ?? pedido.nombreProveedor ?? '',
    lineas,
    totalDiscrepancias,
    todoCoincide: totalDiscrepancias === 0,
  };
}

/** Etiqueta humana del estado de una fila (para el informe). */
export function estadoTexto(linea: LineaConciliada): string {
  switch (linea.estado) {
    case 'OK':
      return 'OK';
    case 'DISCREPANCIA':
      return `DISCREPANCIA: ${linea.discrepancias.join(', ')}`;
    case 'FALTA_EN_ALBARAN':
      return 'FALTA EN ALBARÁN';
    case 'SOBRA_EN_ALBARAN':
      return 'SOBRA EN ALBARÁN (no pedido)';
  }
}
