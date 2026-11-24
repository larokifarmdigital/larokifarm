/** Con receta no se vende online en España: no se busca en webs, se da el precio oficial. */
export type TipoProducto = 'receta' | 'sin_receta' | 'parafarmacia';

export const TIPO_PRODUCTO_LABEL: Record<TipoProducto, string> = {
  receta: 'Con receta',
  sin_receta: 'Sin receta',
  parafarmacia: 'Parafarmacia',
};

/** Producto ya identificado: siempre con CN. El EAN solo si lo sabemos seguro. */
export interface Producto {
  cn: string;
  ean: string | null;
  nombre: string;
  tipo: TipoProducto;
}

/** Candidato de una búsqueda por nombre (el usuario elige uno). */
export interface Candidato {
  cn: string;
  nombre: string;
  /** Orientativo: el tipo definitivo se decide al identificar por CN. */
  tipo: TipoProducto;
}

/**
 * - verificado: la ficha muestra el mismo CN/EAN. Único precio "bueno".
 * - sin_codigo: hay ficha con precio, pero no muestra ningún código: orientativo.
 * - no_encontrado: no lo tienen (o lo que tienen es otro producto/tamaño).
 * - bloquea: la web no deja consultar de forma automática.
 */
export type EstadoOferta = 'verificado' | 'sin_codigo' | 'no_encontrado' | 'bloquea' | 'error';

export interface Oferta {
  farmacia: string;
  estado: EstadoOferta;
  /** Precio de 1 unidad en la ficha. */
  precio: number | null;
  /** Precio tachado (oferta), si lo hay. */
  precioAntes: number | null;
  /** Enlace real a la ficha. */
  url: string | null;
  nombreFicha: string | null;
  /** Detalle técnico para el administrador (qué código mostraba la ficha, etc.). */
  nota: string | null;
  consultadoEn: string;
}

/** Farmacia online de la lista fija elegida por gestión. */
export interface FarmaciaOnline {
  clave: string;
  nombre: string;
  /** No vende medicamentos sin receta: no se consulta para ellos. */
  soloParafarmacia?: boolean;
}

export interface Consulta {
  id: string;
  consulta: string;
  producto: Producto;
  precioOficial: number | null;
  creadaEn: string;
  autor: string | null;
  ofertas: Oferta[];
}

export interface ConsultaResumen {
  id: string;
  producto: Producto;
  creadaEn: string;
  autor: string | null;
  precioOficial: number | null;
  mejorPrecio: number | null;
  /** Farmacias con precio verificado. */
  conPrecio: number;
  /** Farmacias que respondieron. */
  consultadas: number;
}
