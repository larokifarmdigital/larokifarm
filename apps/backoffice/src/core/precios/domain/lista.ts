// Validación de una lista subida en Excel (CN obligatorio; EAN y nombre
// opcionales). Funciones puras: las usan el servidor y la vista previa.
import { cnDeCodigo, cnDeEanNacional, soloDigitos } from './codigos';

export const MAX_FILAS_LISTA = 5000;

export interface FilaLista {
  /** Número de fila en el Excel (1 = cabecera). */
  fila: number;
  cn: string;
  ean: string | null;
  nombre: string | null;
}

export interface FilaDescartada {
  fila: number;
  valor: string;
  motivo: string;
}

export interface ListaValidada {
  validas: FilaLista[];
  descartadas: FilaDescartada[];
  /** Columnas encontradas en la cabecera (para enseñarlas en la vista previa). */
  columnas: { cn: string; ean: string | null; nombre: string | null };
}

const CABECERA_CN = /^(cn|c\.?\s?n\.?|c[oó]d(igo|\.)?\s*nacional|idarticu|cod\.?\s*art[ií]culo)$/i;
const CABECERA_EAN = /^(ean|ean\s?13|c[oó]d(igo|\.)?\s*(de\s*)?barras|gtin|barcode)$/i;
const CABECERA_NOMBRE = /^(nombre|descripci[oó]n|producto|art[ií]culo|denominaci[oó]n)$/i;

export class ListaInvalidaError extends Error {}

const celda = (v: unknown) => (v == null ? '' : String(v).trim());

/**
 * CN de una celda. Acepta 6 cifras, 5 (Excel quita el 0 inicial), 7 con el
 * dígito de control correcto y el EAN nacional 847000…; nada más.
 */
function cnDeCelda(v: string): string | null {
  const d = soloDigitos(v);
  if (!d || d.length !== v.replace(/[\s.-]/g, '').length) return null;
  if (d.length === 5) return `0${d}`;
  if (d.length === 13) return cnDeEanNacional(d);
  return cnDeCodigo(d);
}

/** Filas de la primera hoja (matriz de celdas) → filas válidas y descartadas con su motivo. */
export function validarLista(matriz: unknown[][]): ListaValidada {
  // La cabecera puede no estar en la primera fila (títulos encima): se busca en las 10 primeras.
  let iCab = -1;
  let idx = { cn: -1, ean: -1, nombre: -1 };
  for (let i = 0; i < Math.min(10, matriz.length) && iCab < 0; i++) {
    const cab = (matriz[i] ?? []).map(celda);
    const cn = cab.findIndex((c) => CABECERA_CN.test(c));
    if (cn >= 0) {
      iCab = i;
      idx = { cn, ean: cab.findIndex((c) => CABECERA_EAN.test(c)), nombre: cab.findIndex((c) => CABECERA_NOMBRE.test(c)) };
    }
  }
  if (iCab < 0) throw new ListaInvalidaError('No encontramos la columna de códigos nacionales. Ponle de título «CN» o «Código nacional» en la primera fila y vuelve a subirlo.');
  const cab = (matriz[iCab] ?? []).map(celda);
  const datos = matriz.slice(iCab + 1);
  if (datos.filter((r) => (r ?? []).some((c) => celda(c))).length > MAX_FILAS_LISTA) {
    throw new ListaInvalidaError(`El archivo tiene más de ${MAX_FILAS_LISTA.toLocaleString('es-ES')} productos y el máximo es ${MAX_FILAS_LISTA.toLocaleString('es-ES')}. Divídelo en varias listas.`);
  }

  const validas: FilaLista[] = [];
  const descartadas: FilaDescartada[] = [];
  const vistos = new Map<string, number>();
  datos.forEach((r, i) => {
    const fila = iCab + i + 2;
    const valor = celda(r?.[idx.cn]);
    const ean = idx.ean >= 0 ? soloDigitos(celda(r?.[idx.ean])) || null : null;
    const nombre = idx.nombre >= 0 ? celda(r?.[idx.nombre]).slice(0, 200) || null : null;
    if (!valor && !ean && !nombre) return; // fila vacía
    // Sin CN pero con EAN nacional: el CN va dentro.
    const cn = valor ? cnDeCelda(valor) : ean ? cnDeEanNacional(ean) : null;
    if (!cn) {
      const soloEan = !valor && ean;
      descartadas.push({
        fila,
        valor: valor || ean || nombre || '',
        motivo: soloEan
          ? 'Solo tiene el código de barras del fabricante: hace falta el código nacional'
          : valor
            ? 'Código nacional mal escrito'
            : 'Sin código nacional',
      });
      return;
    }
    const previa = vistos.get(cn);
    if (previa) {
      descartadas.push({ fila, valor, motivo: `Repetido (ya está en la fila ${previa})` });
      return;
    }
    vistos.set(cn, fila);
    validas.push({ fila, cn, ean: ean && ean.length === 13 ? ean : null, nombre });
  });
  return {
    validas,
    descartadas,
    columnas: { cn: cab[idx.cn], ean: idx.ean >= 0 ? cab[idx.ean] : null, nombre: idx.nombre >= 0 ? cab[idx.nombre] : null },
  };
}

// ── Listas guardadas y sus ejecuciones ────────────────────────────────────

export type EstadoEjecucion = 'en_cola' | 'comparando' | 'terminada' | 'con_error' | 'cancelada';

export interface Ejecucion {
  id: string;
  estado: EstadoEjecucion;
  total: number;
  hechos: number;
  conPrecio: number;
  error: string | null;
  creadaEn: string;
  empezadaEn: string | null;
  terminadaEn: string | null;
  /** Último latido del proceso (si lleva rato sin latir estando "comparando", se ha caído). */
  latidoEn: string | null;
  autor: string | null;
}

export interface ListaResumen {
  id: string;
  nombre: string;
  archivo: string;
  productos: number;
  creadaEn: string;
  autor: string | null;
  ultima: Ejecucion | null;
}

/** Un producto de la lista en una ejecución, con lo que se encontró. */
export interface FilaResultado {
  posicion: number;
  cn: string;
  nombreExcel: string | null;
  estado: 'pendiente' | 'hecho' | 'error';
  reutilizado: boolean;
  checkId: string | null;
  producto: { nombre: string; tipo: import('./models').TipoProducto; ean: string | null } | null;
  precioOficial: number | null;
  mejorPrecio: number | null;
  mejorFarmacia: string | null;
  mejorUrl: string | null;
  conPrecio: number;
  consultadas: number;
  consultadoEn: string | null;
  /** Precio verificado por farmacia (solo para el Excel). */
  porFarmacia?: Record<string, number | null>;
}

export type FiltroResultado = 'con_precio' | 'sin_precio' | 'receta' | 'pendiente';

/** "Comparando" sin latido en este tiempo = el proceso se ha caído (se puede reanudar). */
export const LATIDO_MAX_MS = 5 * 60 * 1000;

export function ejecucionParada(e: Pick<Ejecucion, 'estado' | 'latidoEn' | 'empezadaEn'>, ahora = Date.now()): boolean {
  if (e.estado !== 'comparando') return false;
  const ultimo = e.latidoEn ?? e.empezadaEn;
  return !ultimo || ahora - new Date(ultimo).getTime() > LATIDO_MAX_MS;
}

/** Segundos por producto que no se reutiliza (10 webs a 1 petición/s, ~3 peticiones por producto y web). */
const SEGUNDOS_POR_PRODUCTO = 3.5;

/** Arranque fijo (abrir las webs, primer producto) además de lo que cuesta cada producto. */
const SEGUNDOS_ARRANQUE = 40;

export function estimarSegundos(productosPorBuscar: number): number {
  return productosPorBuscar <= 0 ? 0 : Math.round(SEGUNDOS_ARRANQUE + productosPorBuscar * SEGUNDOS_POR_PRODUCTO);
}

/** "menos de un minuto", "unos 25 minutos", "unas 2 horas y media". */
export function textoDuracion(segundos: number): string {
  if (segundos < 60) return 'menos de un minuto';
  const min = segundos / 60;
  if (min < 3) return 'un par de minutos';
  if (min < 60) return `unos ${Math.max(5, Math.round(min / 5) * 5)} minutos`;
  const medias = Math.round((min / 60) * 2) / 2;
  const h = Math.floor(medias);
  return `${h === 1 ? 'una hora' : `unas ${h} horas`}${medias % 1 ? ' y media' : ''}`;
}
