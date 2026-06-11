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
  pdf: T;
  excel: T;
  clave: string;
}

/** Empareja PDFs con Excels por clave de nombre. Lo no emparejado va a `sueltos`. */
export function emparejar<T extends ItemArchivo>(
  items: T[],
): { pares: Array<ParEmparejado<T>>; sueltos: T[] } {
  const pdfs = items.filter((i) => i.tipo === 'pdf');
  const excels = items.filter((i) => i.tipo === 'excel');
  const excelUsado = new Array<boolean>(excels.length).fill(false);
  const pares: Array<ParEmparejado<T>> = [];
  const sueltos: T[] = [];

  for (const pdf of pdfs) {
    const clave = claveArchivo(pdf.nombre);
    const idx =
      clave === ''
        ? -1
        : excels.findIndex((e, i) => !excelUsado[i] && claveArchivo(e.nombre) === clave);
    if (idx >= 0) {
      excelUsado[idx] = true;
      pares.push({ pdf, excel: excels[idx], clave });
    } else {
      sueltos.push(pdf);
    }
  }
  excels.forEach((e, i) => {
    if (!excelUsado[i]) sueltos.push(e);
  });

  return { pares, sueltos };
}
