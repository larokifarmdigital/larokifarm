import type { LineaAlbaran, LineaConciliada } from '../core/tipos';

/** Contrato de la API `POST /api/conciliar`. Compartido por el route y el cliente. */

export interface DetalleConciliacion {
  numeroAlbaran: string;
  lineas: LineaConciliada[];
  /** Líneas tal cual las extrajo Gemini (para depurar la lectura del PDF). */
  lineasCrudas?: LineaAlbaran[];
}

export interface ResultadoPar {
  id: number;
  etiqueta: string;
  proveedor: string;
  estado: 'OK' | 'DISCREPANCIAS' | 'ERROR';
  nDiscrepancias: number;
  nombreArchivo?: string;
  /** .xlsx del informe en base64 (el ZIP se arma en el navegador). */
  informeBase64?: string;
  /** Detalle por línea para previsualizar sin descargar. */
  detalle?: DetalleConciliacion;
  error?: string;
}

export interface RespuestaConciliacion {
  resumen: ResultadoPar[];
}
