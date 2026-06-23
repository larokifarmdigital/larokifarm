/**
 * Auto-emparejado de archivos por nombre (Modo B). Empareja un PDF (albarán) con
 * un Excel (pedido) cuando comparten "clave" de nombre: el nombre sin extensión,
 * normalizado y sin las palabras de rol (albarán/pedido/…). Así
 * "DENTAID_albaran.pdf" empareja con "DENTAID_pedido.xlsx".
 */

const PALABRAS_ROL = new Set([
  'albaran', 'albaranes', 'alb', 'pedido', 'pedidos', 'ped', 'order', 'orders',
  'factura', 'conciliacion',
]);

export type TipoArchivo = 'pdf' | 'excel';

export function tipoPorNombre(nombre: string): TipoArchivo | null {
  if (/\.pdf$/i.test(nombre)) return 'pdf';
  if (/\.(xlsx|xlsm|xls)$/i.test(nombre)) return 'excel';
  return null;
}

/** Clave de emparejado: base del nombre, sin tildes, sin rol, sin separadores. */
export function claveArchivo(nombre: string): string {
  const base = nombre
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return base
    .split(' ')
    .filter((t) => t && !PALABRAS_ROL.has(t))
    .join('');
}

export interface ItemArchivo {
  nombre: string;
  tipo: TipoArchivo;
}

export interface ParEmparejado<T> {
  /** 1..N PDFs con la misma clave (caso multi-PDF: albarán + factura del mismo envío). */
  pdfs: T[];
  excel: T;
  clave: string;
}

/**
 * Empareja PDFs con Excels por clave de nombre. Varios PDFs con la MISMA clave
 * (ej. `NESTLE_albaran.pdf` + `NESTLE_factura.pdf`) van al mismo par. Un Excel
 * solo puede pertenecer a un par; si llegan dos Excels con la misma clave, el
 * segundo queda como suelto. Lo no emparejado va a `sueltos`.
 */
export function emparejar<T extends ItemArchivo>(
  items: T[],
): { pares: Array<ParEmparejado<T>>; sueltos: T[] } {
  const pdfsPorClave = new Map<string, T[]>();
  const excelPorClave = new Map<string, T>();
  const sueltos: T[] = [];

  for (const it of items) {
    const c = claveArchivo(it.nombre);
    if (!c) {
      sueltos.push(it);
      continue;
    }
    if (it.tipo === 'pdf') {
      const arr = pdfsPorClave.get(c) ?? [];
      arr.push(it);
      pdfsPorClave.set(c, arr);
    } else {
      if (excelPorClave.has(c)) sueltos.push(it);
      else excelPorClave.set(c, it);
    }
  }

  const pares: Array<ParEmparejado<T>> = [];
  for (const [clave, pdfs] of pdfsPorClave) {
    const excel = excelPorClave.get(clave);
    if (excel) {
      pares.push({ pdfs, excel, clave });
      excelPorClave.delete(clave);
    } else {
      sueltos.push(...pdfs);
    }
  }
  for (const excel of excelPorClave.values()) sueltos.push(excel);

  return { pares, sueltos };
}
