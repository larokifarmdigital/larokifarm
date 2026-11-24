import { AsyncLocalStorage } from 'node:async_hooks';
import { cnDeCodigo, cnDeEanNacional, soloDigitos } from '../../domain/codigos';
import type { Producto } from '../../domain/models';
import type { ResultadoFarmacia } from '../../domain/ports';
import { WebBloqueaError } from '../web/clienteWeb';

export interface DatosFicha {
  url: string;
  precio: number | null;
  precioAntes: number | null;
  nombre: string | null;
  /** Códigos que muestra la ficha y pueden ser el CN (sku, referencia, "Código:"). */
  codigos: (string | null | undefined)[];
  ean: string | null;
}

/**
 * LA regla del comparador: la ficha vale solo si muestra nuestro CN o nuestro
 * EAN (o un EAN nacional que contiene el CN).
 * - 'verificado': coincide.
 * - 'sin_codigo': la ficha no muestra ningún código comparable.
 * - 'distinto': muestra otro código → es otro producto o presentación.
 */
export function comprobarFicha(p: Producto, f: DatosFicha): 'verificado' | 'sin_codigo' | 'distinto' {
  const ean = soloDigitos(f.ean);
  if (p.ean && ean && ean === p.ean) return 'verificado';
  if (ean && cnDeEanNacional(ean) === p.cn) return 'verificado';
  const cns = f.codigos.map(cnDeCodigo).filter(Boolean);
  if (cns.includes(p.cn)) return 'verificado';
  const hayCodigo = f.codigos.some((c) => soloDigitos(c).length > 0);
  // Un EAN de fabricante no se puede comparar si no conocemos el nuestro.
  if (!hayCodigo && (!ean || (!p.ean && !cnDeEanNacional(ean)))) return 'sin_codigo';
  return 'distinto';
}

export function resultadoDeFicha(p: Producto, f: DatosFicha, nota?: string): ResultadoFarmacia {
  const c = comprobarFicha(p, f);
  const antes = f.precioAntes && f.precio && f.precioAntes > f.precio + 0.004 ? f.precioAntes : null;
  if (c === 'distinto') {
    // Nunca se da el precio de otra presentación: queda solo en la nota.
    return {
      ...NO_ENCONTRADO,
      nota: [nota, `la ficha encontrada es otro producto (${f.nombre ?? '?'}, código ${f.codigos.filter(Boolean).join('/') || f.ean})`]
        .filter(Boolean)
        .join('; '),
    };
  }
  return {
    estado: c === 'verificado' ? 'verificado' : 'sin_codigo',
    precio: f.precio,
    precioAntes: antes,
    // El enlace acaba en un href de la UI: solo https (nunca javascript: ni similares).
    url: /^https:\/\/[^\s"'<>]+$/.test(f.url) ? f.url : null,
    nombreFicha: f.nombre,
    nota: nota ?? null,
  };
}

export const NO_ENCONTRADO: ResultadoFarmacia = {
  estado: 'no_encontrado',
  precio: null,
  precioAntes: null,
  url: null,
  nombreFicha: null,
  nota: null,
};

/** Envuelve la búsqueda de un adaptador: bloqueos y errores nunca rompen la consulta. */
export async function conErrores(fn: () => Promise<ResultadoFarmacia>): Promise<ResultadoFarmacia> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof WebBloqueaError) return { ...NO_ENCONTRADO, estado: 'bloquea', nota: e.message };
    const msg = e instanceof Error ? e.message : String(e);
    return { ...NO_ENCONTRADO, estado: 'error', nota: msg.slice(0, 300) };
  }
}

/** Nombre limpio para buscar ("FAES @ PRO FAES4 30CAPS" → "PRO FAES4 30CAPS"). */
export function nombreParaBuscar(nombre: string): string {
  return nombre.replace(/[@!]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// La búsqueda por nombre (último recurso de cada adaptador) dio 1 de 267 precios
// verificados en las pruebas y casi duplica las peticiones cuando el producto
// no está. En las listas (miles de productos) se desactiva; en "Comparar precio"
// se mantiene.
const sinNombre = new AsyncLocalStorage<true>();
export const conBusquedaPorNombre = () => !sinNombre.getStore();
export function sinBusquedaPorNombre<T>(fn: () => Promise<T>): Promise<T> {
  return sinNombre.run(true, fn);
}
