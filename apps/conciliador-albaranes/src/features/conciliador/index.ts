// API pública de la feature conciliador (el motor). Lo que consumen el route
// handler y la UI. Lo interno no se reexporta.
export { conciliar, estadoTexto, TOL_PRECIO, TOL_UNIDADES, TOL_DESCUENTO } from './core/comparar';
export { extraerAlbaran } from './core/extraerAlbaran';
export { leerPedido } from './core/leerPedido';
export { generarInforme, nombreInforme } from './core/generarInforme';
export { normalizarProveedor, mismoProveedor } from './core/proveedor';
export { limpiarCN, num } from './core/numeros';
export type {
  AlbaranData,
  PedidoData,
  Conciliacion,
  LineaConciliada,
  LineaAlbaran,
  LineaPedido,
  EstadoConciliacion,
  TipoDiscrepancia,
} from './core/tipos';
