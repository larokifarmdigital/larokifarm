/**
 * Tipos del dominio de conciliación. Núcleo puro: no depende de Next ni de HTTP,
 * así corre igual en Node (tests) y en el runtime de Cloudflare Workers.
 */

/** Línea extraída de un albarán PDF (vía Gemini). */
export interface LineaAlbaran {
  codigo?: string;
  codigo_nacional?: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;
}

/** Datos estructurados de un albarán PDF. */
export interface AlbaranData {
  numero_albaran: string;
  proveedor?: string;
  fecha?: string;
  numero_pedido?: string;
  lineas: LineaAlbaran[];
}

/** Línea del pedido leída del Excel del cliente. */
export interface LineaPedido {
  codigoArticulo: string;
  descripcion?: string;
  unidades: number;
  precio: number;
  descuento: number;
}

/** Datos del pedido (Excel). Los campos de proveedor son opcionales (pendiente #1). */
export interface PedidoData {
  nProveedor?: string;
  nombreProveedor?: string;
  lineas: LineaPedido[];
}

export type TipoDiscrepancia = 'unidades' | 'precio' | 'descuento';

export type EstadoConciliacion =
  | 'OK'
  | 'DISCREPANCIA'
  | 'FALTA_EN_ALBARAN' // pedido pero no servido
  | 'SOBRA_EN_ALBARAN'; // servido pero no pedido

/** Una fila del informe: un Código Nacional cruzado entre pedido y albarán. */
export interface LineaConciliada {
  cn: string;
  descripcion: string;
  udsPedido: number | null;
  udsAlbaran: number | null;
  precioPedido: number | null;
  precioAlbaran: number | null;
  dtoPedido: number | null;
  dtoAlbaran: number | null;
  estado: EstadoConciliacion;
  discrepancias: TipoDiscrepancia[];
}

/** Resultado de conciliar un albarán contra su pedido. */
export interface Conciliacion {
  numeroAlbaran: string;
  proveedor: string;
  lineas: LineaConciliada[];
  totalDiscrepancias: number;
  todoCoincide: boolean;
}
