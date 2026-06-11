import { NextResponse } from 'next/server';
import {
  conciliar,
  extraerAlbaran,
  generarInforme,
  leerPedido,
  nombreInforme,
} from '@/features/conciliador';
import { getEnv } from '@/shared/lib/env';
import type { ResultadoPar } from '@/features/conciliador/api/contrato';

export const runtime = 'nodejs';

/**
 * POST /api/conciliar  (Fase 2 — Modo B: pares explícitos)
 *
 * multipart/form-data con pares por índice:
 *   pdf_0, xlsx_0, [label_0], pdf_1, xlsx_1, ...
 *
 * Respuesta JSON (stateless): un resumen por par + el informe en base64. El ZIP
 * "Descargar todo" lo arma el navegador con fflate a partir de estos base64.
 */

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export async function POST(req: Request) {
  const env = await getEnv();

  if (env.ACCESO_CLAVE) {
    const dada = req.headers.get('x-acceso-clave');
    if (dada !== env.ACCESO_CLAVE) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
  }
  if (!env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Falta GEMINI_API_KEY en el servidor' }, { status: 500 });
  }

  const form = await req.formData();

  // Recoger pares por índice.
  const indices = new Set<number>();
  for (const key of form.keys()) {
    const m = key.match(/^(?:pdf|xlsx)_(\d+)$/);
    if (m) indices.add(Number(m[1]));
  }

  const tareas = [...indices].sort((a, b) => a - b).map(async (i): Promise<ResultadoPar> => {
    const etiqueta = String(form.get(`label_${i}`) ?? `Par ${i + 1}`);
    const pdf = form.get(`pdf_${i}`);
    const xlsx = form.get(`xlsx_${i}`);

    if (!(pdf instanceof File) || !(xlsx instanceof File)) {
      return { id: i, etiqueta, proveedor: '', estado: 'ERROR', nDiscrepancias: 0, error: 'Faltan archivos del par (PDF + Excel).' };
    }

    try {
      const [pdfBytes, xlsxBytes] = await Promise.all([
        pdf.arrayBuffer().then((b) => new Uint8Array(b)),
        xlsx.arrayBuffer().then((b) => new Uint8Array(b)),
      ]);

      const albaran = await extraerAlbaran(toBase64(pdfBytes), { apiKey: env.GEMINI_API_KEY! });
      const pedido = leerPedido(xlsxBytes);
      const conc = conciliar(albaran, pedido);
      const informe = generarInforme(conc);

      return {
        id: i,
        etiqueta,
        proveedor: conc.proveedor,
        estado: conc.todoCoincide ? 'OK' : 'DISCREPANCIAS',
        nDiscrepancias: conc.totalDiscrepancias,
        nombreArchivo: nombreInforme(conc, pedido.nProveedor),
        informeBase64: toBase64(informe),
        detalle: { numeroAlbaran: conc.numeroAlbaran, lineas: conc.lineas },
      };
    } catch (e) {
      return {
        id: i,
        etiqueta,
        proveedor: '',
        estado: 'ERROR',
        nDiscrepancias: 0,
        error: e instanceof Error ? e.message : 'Error desconocido',
      };
    }
  });

  const resumen = await Promise.all(tareas);
  return NextResponse.json({ resumen });
}
