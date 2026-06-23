import { NextResponse } from 'next/server';
import {
  conciliar,
  extraerAlbaran,
  fusionarAlbaranes,
  generarInforme,
  leerPedido,
  nombreInforme,
} from '@/features/conciliador';
import { getEnv } from '@/shared/lib/env';
import type { ResultadoPar } from '@/features/conciliador/api/contrato';

export const runtime = 'nodejs';

/**
 * POST /api/conciliar  (Fase 2 — Modo B: pares explícitos, multi-PDF)
 *
 * multipart/form-data con pares por índice. Cada par lleva 1..N PDFs + 1 Excel:
 *   pdfs_0 (multivaluado), xlsx_0, [label_0], pdfs_1, xlsx_1, ...
 *
 * Cuando el par tiene varios PDFs (típicamente albarán + factura del mismo
 * envío), cada uno se extrae por separado con Gemini y luego se fusionan en un
 * único `AlbaranData` antes de conciliar contra el pedido.
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

  // Recoger índices de pares: cualquier campo pdfs_N o xlsx_N.
  const indices = new Set<number>();
  for (const key of form.keys()) {
    const m = key.match(/^(?:pdfs|xlsx)_(\d+)$/);
    if (m) indices.add(Number(m[1]));
  }

  const apiKey = env.GEMINI_API_KEY;

  const tareas = [...indices].sort((a, b) => a - b).map(async (i): Promise<ResultadoPar> => {
    const etiqueta = String(form.get(`label_${i}`) ?? `Par ${i + 1}`);
    const pdfs = form.getAll(`pdfs_${i}`).filter((v): v is File => v instanceof File);
    const xlsx = form.get(`xlsx_${i}`);

    if (pdfs.length === 0 || !(xlsx instanceof File)) {
      return {
        id: i,
        etiqueta,
        proveedor: '',
        estado: 'ERROR',
        nDiscrepancias: 0,
        error: 'Faltan archivos del par (al menos 1 PDF + 1 Excel).',
      };
    }

    try {
      const xlsxBytes = new Uint8Array(await xlsx.arrayBuffer());

      // Extraer cada PDF en paralelo. Cada llamada a Gemini es independiente;
      // el orden de respuesta no importa porque la fusión es conmutativa.
      const albaranes = await Promise.all(
        pdfs.map(async (pdf) => {
          const bytes = new Uint8Array(await pdf.arrayBuffer());
          return extraerAlbaran(toBase64(bytes), { apiKey });
        }),
      );

      const albaranFusionado = fusionarAlbaranes(albaranes);
      const pedido = leerPedido(xlsxBytes);
      const conc = conciliar(albaranFusionado, pedido);
      const informe = generarInforme(conc);

      return {
        id: i,
        etiqueta,
        proveedor: conc.proveedor,
        estado: conc.todoCoincide ? 'OK' : 'DISCREPANCIAS',
        nDiscrepancias: conc.totalDiscrepancias,
        nombreArchivo: nombreInforme(conc, pedido.nProveedor),
        informeBase64: toBase64(informe),
        detalle: {
          numeroAlbaran: conc.numeroAlbaran,
          lineas: conc.lineas,
          // Para el debug mostramos lo extraído de CADA PDF de forma concatenada.
          lineasCrudas: albaranes.flatMap((a) => a.lineas),
        },
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
