import * as XLSX from 'xlsx';
import { num } from './numeros';
import type { PedidoData } from './tipos';

/**
 * Lee el Excel de pedido del cliente (§8). SheetJS funciona en Node y Workers.
 * Cabecera en la fila 1. Mapeo según el Excel real del cliente:
 *   C.N.            → CodigoArticulo
 *   unidades        → Unidades        (antes se buscaba "UnidadesPedidas" — erróneo)
 *   precio          → Precio (PVL base)
 *   descuento       → %Descuento      (viene como 21, no fracción)
 *   descripción     → DescripcionArticulo
 *   nº proveedor    → CodigoProveedor
 *   nombre proveedor→ RazonSocial
 * La búsqueda es tolerante (case/acentos) y admite nombres alternativos.
 */

/** Normaliza una clave de cabecera para casarla de forma tolerante. */
function clave(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function buscarColumna(cabeceras: string[], candidatos: string[]): string | undefined {
  const objetivo = candidatos.map(clave);
  for (const h of cabeceras) {
    if (objetivo.includes(clave(h))) return h;
  }
  return undefined;
}

export function leerPedido(bytes: Uint8Array | ArrayBuffer): PedidoData {
  const wb = XLSX.read(bytes, { type: 'array' });
  const hoja = wb.Sheets[wb.SheetNames[0]];
  if (!hoja) return { lineas: [] };

  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: '' });
  if (filas.length === 0) return { lineas: [] };

  const cabeceras = Object.keys(filas[0]);
  const colCN = buscarColumna(cabeceras, ['CodigoArticulo']);
  const colAlt = buscarColumna(cabeceras, ['CodigoAlternativo', 'CodigoEAN', 'EAN', 'CodigoBarras']);
  const colUds = buscarColumna(cabeceras, ['Unidades', 'UnidadesPedidas']);
  const colPrecio = buscarColumna(cabeceras, ['Precio']);
  const colDto = buscarColumna(cabeceras, ['%Descuento', 'Descuento']);
  const colDesc = buscarColumna(cabeceras, ['DescripcionArticulo', 'Descripcion']);
  const colNProv = buscarColumna(cabeceras, ['CodigoProveedor', 'NumeroProveedor', 'NProveedor']);
  const colNombreProv = buscarColumna(cabeceras, ['RazonSocial', 'NombreProveedor', 'Proveedor']);

  const lineas = filas
    .map((row) => ({
      codigoArticulo: colCN ? String(row[colCN] ?? '') : '',
      codigoAlternativo: colAlt ? String(row[colAlt] ?? '') : '',
      descripcion: colDesc ? String(row[colDesc] ?? '') : '',
      unidades: colUds ? num(row[colUds]) : 0,
      precio: colPrecio ? num(row[colPrecio]) : 0,
      descuento: colDto ? num(row[colDto]) : 0,
    }))
    .filter((l) => l.codigoArticulo.trim() !== '' || l.codigoAlternativo.trim() !== '');

  const primera = filas.find((r) => (colNombreProv ? String(r[colNombreProv] ?? '').trim() : ''));

  return {
    nProveedor: colNProv && primera ? String(primera[colNProv] ?? '').trim() || undefined : undefined,
    nombreProveedor:
      colNombreProv && primera ? String(primera[colNombreProv] ?? '').trim() || undefined : undefined,
    lineas,
  };
}
