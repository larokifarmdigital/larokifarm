import { limpiarAlt, limpiarCN, num } from './numeros';
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

interface Item {
  cn: string; // Código Nacional normalizado (6 dígitos) o ''
  alt: string; // Código alternativo / EAN normalizado o ''
  descripcion: string;
  uds: number; // unidades FACTURADAS
  bonus: number; // unidades de bonificación/regalo
  precio: number;
  dto: number;
}

interface FilaCruda {
  cnRaw: unknown;
  altRaw: unknown;
  descripcion: string;
  uds: unknown;
  precio: unknown;
  dto: unknown;
  bonifRaw?: unknown;
}

interface LineaNorm {
  cant: number;
  precio: number;
  dto: number;
  bonif: number;
}

/** Línea que "parece" una bonificación/regalo (no es la facturada del producto). */
function pareceRegalo(l: LineaNorm): boolean {
  return l.precio === 0 || l.dto === 0 || l.dto === 100;
}

function masUnidades(ls: LineaNorm[]): LineaNorm {
  return ls.reduce((a, b) => (b.cant > a.cant ? b : a));
}

/**
 * Agrupa líneas en items por su identidad (C.N.; si no, código alternativo/EAN) y
 * separa unidades FACTURADAS de BONIFICACIÓN. Maneja dos formatos:
 *  - columna BONIF. en la misma línea (UDS es total → facturadas = UDS − BONIF), y
 *  - el mismo producto en VARIAS líneas (una facturada con descuento + otra de regalo
 *    sin descuento / a precio 0): la línea facturada manda en precio/descuento; las que
 *    parecen regalo se cuentan como bonificación.
 * `detectarRegalo` es true para el albarán y false para el pedido (que no tiene regalos).
 */
function agrupar(filas: FilaCruda[], detectarRegalo: boolean): Item[] {
  const grupos = new Map<
    string,
    { cn: string; alt: string; descripcion: string; lineas: LineaNorm[] }
  >();

  for (const f of filas) {
    const cn = limpiarCN(f.cnRaw);
    const alt = limpiarAlt(f.altRaw);
    const clave = cn || alt;
    if (!clave) continue;
    let g = grupos.get(clave);
    if (!g) {
      g = { cn, alt, descripcion: f.descripcion ?? '', lineas: [] };
      grupos.set(clave, g);
    }
    if (!g.alt && alt) g.alt = alt;
    if (!g.descripcion) g.descripcion = f.descripcion ?? '';
    g.lineas.push({ cant: num(f.uds), precio: num(f.precio), dto: num(f.dto), bonif: num(f.bonifRaw) });
  }

  const items: Item[] = [];
  for (const g of grupos.values()) {
    let facturables: LineaNorm[];
    let bonus: number;

    if (!detectarRegalo || g.lineas.length === 1) {
      // Pedido, o una sola línea: todo es facturado (UDS − BONIF). Bonus = BONIF.
      facturables = g.lineas;
      bonus = g.lineas.reduce((s, l) => s + l.bonif, 0);
    } else {
      // Varias líneas del mismo producto en el albarán: separar facturadas de regalo.
      const fact = g.lineas.filter((l) => !pareceRegalo(l));
      facturables = fact.length > 0 ? fact : [masUnidades(g.lineas)];
      const set = new Set(facturables);
      // Bonus: de las facturadas, su columna BONIF.; de las de regalo, SUS unidades
      // (no se suma además su BONIF., o se contarían dos veces los mismos regalos).
      bonus = g.lineas.reduce((s, l) => s + (set.has(l) ? l.bonif : l.cant), 0);
    }

    const charged = facturables.reduce((s, l) => s + Math.max(0, l.cant - l.bonif), 0);
    const principal = masUnidades(facturables); // su precio/descuento manda
    items.push({
      cn: g.cn,
      alt: g.alt,
      descripcion: g.descripcion,
      uds: charged,
      bonus,
      precio: principal.precio,
      dto: principal.dto,
    });
  }
  return items;
}

/** Código a mostrar en el informe (prioriza C.N., luego alternativo). */
function codigoVisible(p: Item | null, a: Item | null): string {
  return p?.cn || a?.cn || p?.alt || a?.alt || '';
}

function comparaCampos(p: Item, a: Item): TipoDiscrepancia[] {
  const d: TipoDiscrepancia[] = [];
  if (Math.abs(p.uds - a.uds) > TOL_UNIDADES) d.push('unidades');
  if (Math.abs(p.precio - a.precio) > TOL_PRECIO) d.push('precio');
  if (Math.abs(p.dto - a.dto) > TOL_DESCUENTO) d.push('descuento');
  return d;
}

/**
 * Concilia un albarán contra su pedido. Cruce primario por C.N. normalizado a 6
 * dígitos; si no casa (o falta), se intenta por código alternativo / EAN (§9).
 */
export function conciliar(albaran: AlbaranData, pedido: PedidoData): Conciliacion {
  // El pedido no tiene bonificaciones → no detectar regalo.
  const itemsPedido = agrupar(
    pedido.lineas.map((l) => ({
      cnRaw: l.codigoArticulo,
      altRaw: l.codigoAlternativo,
      descripcion: l.descripcion ?? '',
      uds: l.unidades,
      precio: l.precio,
      dto: l.descuento,
    })),
    false,
  );

  // El albarán sí: BONIF. en columna y/o líneas de regalo con precio 0.
  const itemsAlbaran = agrupar(
    albaran.lineas.map((l) => ({
      cnRaw: l.codigo_nacional || l.codigo || '',
      altRaw: l.codigo_ean,
      descripcion: l.descripcion ?? '',
      uds: l.cantidad,
      precio: l.precio_unitario,
      dto: l.descuento ?? 0,
      bonifRaw: l.bonificacion,
    })),
    true,
  );

  const pedidoUsado = new Array<boolean>(itemsPedido.length).fill(false);

  // Busca el pedido que cruza con un item de albarán: 1º por C.N., 2º por alt/EAN.
  const buscar = (a: Item): number => {
    if (a.cn) {
      const i = itemsPedido.findIndex((p, idx) => !pedidoUsado[idx] && p.cn !== '' && p.cn === a.cn);
      if (i >= 0) return i;
    }
    if (a.alt) {
      const i = itemsPedido.findIndex((p, idx) => !pedidoUsado[idx] && p.alt !== '' && p.alt === a.alt);
      if (i >= 0) return i;
    }
    return -1;
  };

  const lineas: LineaConciliada[] = [];

  for (const a of itemsAlbaran) {
    const idx = buscar(a);
    if (idx >= 0) {
      pedidoUsado[idx] = true;
      const p = itemsPedido[idx];
      const discrepancias = comparaCampos(p, a);
      lineas.push({
        cn: codigoVisible(p, a),
        descripcion: a.descripcion || p.descripcion,
        udsPedido: p.uds,
        udsAlbaran: a.uds,
        bonifAlbaran: a.bonus,
        precioPedido: p.precio,
        precioAlbaran: a.precio,
        dtoPedido: p.dto,
        dtoAlbaran: a.dto,
        estado: discrepancias.length === 0 ? 'OK' : 'DISCREPANCIA',
        discrepancias,
      });
    } else {
      lineas.push({
        cn: codigoVisible(null, a),
        descripcion: a.descripcion,
        udsPedido: null,
        udsAlbaran: a.uds,
        bonifAlbaran: a.bonus,
        precioPedido: null,
        precioAlbaran: a.precio,
        dtoPedido: null,
        dtoAlbaran: a.dto,
        estado: 'SOBRA_EN_ALBARAN',
        discrepancias: [],
      });
    }
  }

  // Pedido sin albarán que lo sirva.
  itemsPedido.forEach((p, idx) => {
    if (pedidoUsado[idx]) return;
    lineas.push({
      cn: codigoVisible(p, null),
      descripcion: p.descripcion,
      udsPedido: p.uds,
      udsAlbaran: null,
      bonifAlbaran: null,
      precioPedido: p.precio,
      precioAlbaran: null,
      dtoPedido: p.dto,
      dtoAlbaran: null,
      estado: 'FALTA_EN_ALBARAN',
      discrepancias: [],
    });
  });

  // Orden estable: primero las que tienen problema, luego por código.
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
