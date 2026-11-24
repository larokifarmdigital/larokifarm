import { fechaFila } from '@/shared/lib/fechasMadrid';
import type { EstadoOferta, Oferta, TipoProducto } from '@/core/precios/domain';

export const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export const ESTADO_LABEL: Record<EstadoOferta, string> = {
  verificado: 'Verificado',
  sin_codigo: 'Sin código en la ficha',
  no_encontrado: 'No encontrado',
  bloquea: 'La web bloquea el acceso',
  error: 'Error',
};

export const ESTADO_TONO: Record<EstadoOferta, 'green' | 'yellow' | 'neutral' | 'red'> = {
  verificado: 'green',
  sin_codigo: 'yellow',
  no_encontrado: 'neutral',
  bloquea: 'neutral',
  error: 'red',
};

export const ESTADO_AYUDA: Record<EstadoOferta, string> = {
  verificado: 'La ficha muestra el mismo código nacional o código de barras.',
  sin_codigo: 'Tiene precio, pero no hemos podido comprobar que sea el mismo producto.',
  no_encontrado: 'Esta farmacia no lo vende o no aparece en su buscador.',
  bloquea: 'La web no deja consultarla ahora mismo.',
  error: 'No ha respondido. Prueba a volver a consultar.',
};

export const TIPO_TONO: Record<TipoProducto, 'blue' | 'neutral' | 'yellow'> = {
  sin_receta: 'blue',
  parafarmacia: 'neutral',
  receta: 'yellow',
};

const ORDEN: Record<EstadoOferta, number> = { verificado: 0, sin_codigo: 1, no_encontrado: 2, bloquea: 3, error: 4 };

/** Verificadas de más barata a más cara, luego sin código, no encontradas, bloqueos y errores. */
export function ordenarOfertas<T extends Pick<Oferta, 'estado' | 'precio'>>(ofertas: T[]): T[] {
  return [...ofertas].sort(
    (a, b) => ORDEN[a.estado] - ORDEN[b.estado] || (a.precio ?? Infinity) - (b.precio ?? Infinity),
  );
}

/** Precio verificado más bajo (null si ninguno). Los no verificados nunca cuentan. */
export function mejorVerificado(ofertas: Pick<Oferta, 'estado' | 'precio'>[]): number | null {
  const ps = ofertas.filter((o) => o.estado === 'verificado' && o.precio != null).map((o) => o.precio as number);
  return ps.length ? Math.min(...ps) : null;
}

export const esMasBarata = (o: Pick<Oferta, 'estado' | 'precio'>, mejor: number | null) =>
  mejor != null && o.estado === 'verificado' && o.precio != null && Math.abs(o.precio - mejor) < 0.005;

/** "hoy a las 11:14", "ayer a las 09:52", "el jueves 19 nov a las 11:14" (hora de Madrid). */
export function cuando(iso: string): string {
  const larga = fechaFila(new Date(iso)).larga;
  if (/^(Hoy|Ayer)/.test(larga)) return larga.charAt(0).toLowerCase() + larga.slice(1);
  return `el ${larga.charAt(0).toLowerCase()}${larga.slice(1)}`;
}

/**
 * Precio verificado muy lejos de la mediana del resto (algunas webs ponen el
 * CN de la unidad a un duplo o a otra variante): la regla del código no lo
 * puede detectar, así que solo se avisa. Hace falta un mínimo de 4 precios.
 */
export function esAtipico(o: Pick<Oferta, 'estado' | 'precio'>, ofertas: Pick<Oferta, 'estado' | 'precio'>[]): boolean {
  if (o.estado !== 'verificado' || o.precio == null) return false;
  const ps = ofertas.filter((x) => x.estado === 'verificado' && x.precio != null).map((x) => x.precio as number).sort((a, b) => a - b);
  if (ps.length < 4) return false;
  const m = ps.length % 2 ? ps[(ps.length - 1) / 2] : (ps[ps.length / 2 - 1] + ps[ps.length / 2]) / 2;
  return o.precio > m * 1.5 || o.precio < m * 0.6;
}
