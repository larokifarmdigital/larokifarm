import { limpiarAlt, limpiarCN } from './numeros';
import type { AlbaranData, LineaAlbaran } from './tipos';

/**
 * Une N albaranes/facturas del MISMO envío en un único `AlbaranData`.
 *
 * Algunos proveedores reparten la información de un mismo pedido en varios
 * PDFs: el albarán trae cantidades y EAN, la factura trae precio y descuento.
 * Para conciliar contra el pedido (Excel) necesitamos una sola estructura con
 * todos los campos rellenos.
 *
 * Cómo cruza líneas entre PDFs:
 *   Union-find sobre TODOS los identificadores. Dos líneas se consideran el
 *   mismo producto si comparten C.N., EAN o código interno del proveedor —
 *   cualquiera de los tres. Esto es necesario para casos como PEROX donde la
 *   factura SOLO trae código interno y el albarán trae los tres.
 *
 * Cómo elige el valor de cada campo (prioridad por fuente):
 *   - cantidad, bonificacion, EAN, lote   ← ALBARÁN
 *   - precio_unitario, descuento, C.N.    ← FACTURA
 *   - codigo, descripcion                 ← cualquiera no vacío
 *   - Si la fuente preferida no tiene el campo, se cae a la otra.
 *
 * Cabecera (numero_albaran, proveedor, fecha, numero_pedido): primer valor no
 * vacío, dando preferencia al albarán para numero_albaran/fecha y a la factura
 * para numero_pedido. En la práctica suelen coincidir entre PDFs.
 */
export function fusionarAlbaranes(albaranes: AlbaranData[]): AlbaranData {
  if (albaranes.length === 0) {
    return { numero_albaran: '', lineas: [] };
  }
  if (albaranes.length === 1) {
    return albaranes[0];
  }

  // 1. Aplanar todas las líneas etiquetadas con su PDF de origen.
  const items: Origen[] = [];
  for (const a of albaranes) {
    for (const linea of a.lineas) {
      items.push({ tipo: a.tipo_documento ?? 'otro', linea });
    }
  }

  // 2. Union-find: dos líneas se unen si comparten C.N., EAN o código interno.
  const parent = items.map((_, i) => i);
  const find = (x: number): number =>
    parent[x] === x ? x : (parent[x] = find(parent[x]));
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  const indicePorClave = new Map<string, number[]>();
  items.forEach((it, i) => {
    const cn = limpiarCN(it.linea.codigo_nacional);
    const ean = limpiarAlt(it.linea.codigo_ean);
    const cod = limpiarAlt(it.linea.codigo);
    const claves = [
      cn ? `cn:${cn}` : '',
      ean ? `ean:${ean}` : '',
      cod ? `cod:${cod}` : '',
    ].filter((k) => k !== '');
    for (const k of claves) {
      const lista = indicePorClave.get(k) ?? [];
      lista.push(i);
      indicePorClave.set(k, lista);
    }
  });

  for (const indices of indicePorClave.values()) {
    for (let i = 1; i < indices.length; i++) union(indices[0], indices[i]);
  }

  // 3. Agrupar líneas por raíz y fusionar cada grupo.
  const grupos = new Map<number, Origen[]>();
  items.forEach((it, i) => {
    const r = find(i);
    const lista = grupos.get(r) ?? [];
    lista.push(it);
    grupos.set(r, lista);
  });

  const lineas: LineaAlbaran[] = [];
  for (const grupo of grupos.values()) {
    lineas.push(fusionarLineas(grupo));
  }

  // 4. Cabecera: campos del primer PDF no vacíos, priorizando albarán para
  // numero_albaran y fecha; factura para numero_pedido.
  const ordenAlbaranPrimero = [...albaranes].sort(
    (a, b) =>
      (a.tipo_documento === 'albaran' ? 0 : 1) -
      (b.tipo_documento === 'albaran' ? 0 : 1),
  );
  const ordenFacturaPrimero = [...albaranes].sort(
    (a, b) =>
      (a.tipo_documento === 'factura' ? 0 : 1) -
      (b.tipo_documento === 'factura' ? 0 : 1),
  );

  return {
    numero_albaran: primerStr(ordenAlbaranPrimero, (a) => a.numero_albaran) ?? '',
    proveedor: primerStr(ordenAlbaranPrimero, (a) => a.proveedor),
    fecha: primerStr(ordenAlbaranPrimero, (a) => a.fecha),
    numero_pedido: primerStr(ordenFacturaPrimero, (a) => a.numero_pedido),
    tipo_documento: 'otro',
    lineas,
  };
}

interface Origen {
  tipo: NonNullable<AlbaranData['tipo_documento']>;
  linea: LineaAlbaran;
}

/** Fusiona las líneas de un mismo producto venidas de varios PDFs. */
function fusionarLineas(grupo: Origen[]): LineaAlbaran {
  const albaran = grupo.filter((o) => o.tipo === 'albaran');
  const factura = grupo.filter((o) => o.tipo === 'factura');
  const otros = grupo.filter((o) => o.tipo === 'otro');

  // Prioridad por campo: primero la lista que "manda", luego las otras.
  const ordenAlbaran = [...albaran, ...otros, ...factura];
  const ordenFactura = [...factura, ...albaran, ...otros];
  const ordenCualquiera = grupo;

  return {
    codigo: tomarStr(ordenCualquiera, (l) => l.codigo),
    codigo_nacional: tomarStr(ordenFactura, (l) => l.codigo_nacional),
    codigo_ean: tomarStr(ordenAlbaran, (l) => l.codigo_ean),
    descripcion: tomarStr(ordenAlbaran, (l) => l.descripcion) ?? '',
    cantidad: tomarNum(ordenAlbaran, (l) => l.cantidad) ?? 0,
    precio_unitario: tomarNum(ordenFactura, (l) => l.precio_unitario) ?? 0,
    descuento: tomarNumIncl0(ordenFactura, (l) => l.descuento),
    bonificacion: tomarNum(ordenAlbaran, (l) => l.bonificacion),
  };
}

/** Primera cadena no vacía recorriendo `fuentes` en orden. */
function tomarStr(fuentes: Origen[], get: (l: LineaAlbaran) => string | undefined): string | undefined {
  for (const o of fuentes) {
    const v = get(o.linea);
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return undefined;
}

/** Primer número distinto de 0 (y definido). 0 se trata como "no informado". */
function tomarNum(fuentes: Origen[], get: (l: LineaAlbaran) => number | undefined): number | undefined {
  for (const o of fuentes) {
    const v = get(o.linea);
    if (typeof v === 'number' && v !== 0) return v;
  }
  return undefined;
}

/** Primer número definido (incluyendo 0 — útil para "descuento: 0 está informado"). */
function tomarNumIncl0(fuentes: Origen[], get: (l: LineaAlbaran) => number | undefined): number | undefined {
  for (const o of fuentes) {
    const v = get(o.linea);
    if (typeof v === 'number') return v;
  }
  return undefined;
}

/** Primer string no vacío de una propiedad de cabecera. */
function primerStr(
  fuentes: AlbaranData[],
  get: (a: AlbaranData) => string | undefined,
): string | undefined {
  for (const a of fuentes) {
    const v = get(a);
    if (v && v.trim() !== '') return v;
  }
  return undefined;
}
