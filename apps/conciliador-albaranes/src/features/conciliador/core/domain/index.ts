/**
 * Dominio del conciliador: motor puro. Sin Next, sin Prisma, sin auth, sin
 * fetch (con la excepción documentada de `extraerAlbaran` que llama a Gemini —
 * estrictamente sería un adapter, pero el equipo lo trata como parte del motor
 * porque es la única dependencia externa y se mockea en los tests).
 */
export { conciliar, estadoTexto, TOL_PRECIO, TOL_UNIDADES, TOL_DESCUENTO } from './comparar';
export { extraerAlbaran } from './extraerAlbaran';
export type { ExtraerResultado, UsageMetadata } from './extraerAlbaran';
export { fusionarAlbaranes } from './fusionarAlbaranes';
export { leerPedido } from './leerPedido';
export { generarInforme, nombreInforme } from './generarInforme';
export { normalizarProveedor, mismoProveedor } from './proveedor';
export { limpiarCN, num } from './numeros';
export { claveArchivo, emparejar, tipoPorNombre } from './emparejar';
export type { TipoArchivo } from './emparejar';
export type {
  AlbaranData,
  PedidoData,
  Conciliacion,
  LineaConciliada,
  LineaAlbaran,
  LineaPedido,
  EstadoConciliacion,
  TipoDiscrepancia,
} from './tipos';
