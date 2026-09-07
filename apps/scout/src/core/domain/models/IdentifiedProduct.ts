/**
 * Producto identificado por un ProductIdentifier (típicamente CIMA para medicamentos).
 * Opcional en el reporte: si no se pudo identificar, se muestra solo el input.
 */
export type IdentifiedProduct = {
  nombre: string;
  presentacion?: string;
  fabricante?: string;
};
