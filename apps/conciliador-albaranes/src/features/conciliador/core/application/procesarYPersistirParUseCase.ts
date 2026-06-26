/**
 * Use case: procesar un par (PDFs + Excel) y persistir la comparación.
 *
 * Es la unidad atómica del flujo del conciliador:
 *   1. Extrae cada PDF con Gemini (`core/extraerAlbaran`).
 *   2. Fusiona los albaranes, lee el pedido y concilia (`core/`).
 *   3. Genera el informe `.xlsx`.
 *   4. Pre-genera el id de la comparación → calcula storage keys → sube todos
 *      los archivos al storage.
 *   5. Persiste la `Comparison` + `ComparisonFile[]` en una única transacción
 *      del repositorio (storage primero, BD después: si la BD falla queda
 *      basura en storage; al revés sería peor — registros huérfanos sin bytes).
 *
 * Devuelve la shape pública `ResultadoPar` (mismo contrato que ya consume la
 * UI) con `informeBase64` para que el cliente arme el ZIP.
 *
 * El use case NO conoce auth ni sesiones — solo recibe sus colaboradores por
 * constructor + el input por argumento.
 */
import { createId as cuid } from '@paralleldrive/cuid2';
import { ComparisonStatus } from '@prisma/client';
import type {
  ComparisonFileInput,
  ComparisonRepository,
} from '@/shared/core';
import { buildStorageKey, type StorageRepository, type FileKindKey } from '@/shared/core';
import {
  conciliar,
  extraerAlbaran,
  fusionarAlbaranes,
  generarInforme,
  leerPedido,
  nombreInforme,
} from '../domain';
import type { ResultadoPar } from '../http/contrato';

// Precios actuales gemini-2.5-flash (USD por 1M tokens). Actualizar si cambian.
const GEMINI_PRICE_INPUT_PER_1M_USD = 0.3;
const GEMINI_PRICE_OUTPUT_PER_1M_USD = 2.5;

function calcularCosteUsd(inputTokens: number, outputTokens: number): number {
  const input = (inputTokens / 1_000_000) * GEMINI_PRICE_INPUT_PER_1M_USD;
  const output = (outputTokens / 1_000_000) * GEMINI_PRICE_OUTPUT_PER_1M_USD;
  return input + output;
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export interface ParInput {
  id: number;
  etiqueta: string;
  pdfs: Array<{ filename: string; bytes: Uint8Array }>;
  xlsx: { filename: string; bytes: Uint8Array };
}

export interface ProcesarYPersistirParInput {
  business: { id: string; slug: string };
  userId: string;
  apiKey: string;
  par: ParInput;
}

export class ProcesarYPersistirParUseCase {
  constructor(
    private readonly repo: ComparisonRepository,
    private readonly storage: StorageRepository,
  ) {}

  async execute(input: ProcesarYPersistirParInput): Promise<ResultadoPar> {
    const { business, userId, apiKey, par } = input;
    const t0 = Date.now();
    const comparisonId = cuid();
    const createdAt = new Date();

    try {
      // 1. Extraer cada PDF en paralelo (cada llamada a Gemini es independiente).
      const extracciones = await Promise.all(
        par.pdfs.map(({ bytes }) => extraerAlbaran(toBase64(bytes), { apiKey })),
      );

      // 2. Fusionar + leer pedido + conciliar + generar informe.
      const albaranFusionado = fusionarAlbaranes(extracciones.map((r) => r.data));
      const pedido = leerPedido(par.xlsx.bytes);
      const conc = conciliar(albaranFusionado, pedido);
      const informe = generarInforme(conc);
      const nombre = nombreInforme(conc, pedido.nProveedor);

      // 3. Agregados de tokens y coste.
      const inputTokens = extracciones.reduce((s, r) => s + r.usage.promptTokens, 0);
      const outputTokens = extracciones.reduce(
        (s, r) => s + r.usage.candidatesTokens,
        0,
      );
      const costeUsd = calcularCosteUsd(inputTokens, outputTokens);

      const status: ComparisonStatus = conc.todoCoincide
        ? ComparisonStatus.OK
        : ComparisonStatus.DISCREPANCIAS;

      // 4. Subir archivos al storage usando keys derivados del id ya generado.
      const archivos: Array<{
        kind: FileKindKey;
        filename: string;
        bytes: Uint8Array;
        contentType: string;
      }> = [
        ...par.pdfs.map((p) => ({
          kind: 'PDF_INPUT' as const,
          filename: p.filename,
          bytes: p.bytes,
          contentType: 'application/pdf',
        })),
        {
          kind: 'XLSX_INPUT' as const,
          filename: par.xlsx.filename,
          bytes: par.xlsx.bytes,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        {
          kind: 'REPORT_OUTPUT' as const,
          filename: nombre,
          bytes: informe,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ];

      const fileInputs: ComparisonFileInput[] = await Promise.all(
        archivos.map(async (f) => {
          const key = buildStorageKey({
            businessSlug: business.slug,
            comparisonId,
            kind: f.kind,
            filename: f.filename,
            createdAt,
          });
          await this.storage.upload(key, Buffer.from(f.bytes), f.contentType);
          return {
            kind: f.kind,
            filename: f.filename,
            storageKey: key,
            sizeBytes: f.bytes.byteLength,
          };
        }),
      );

      // 5. Persistir Comparison + ComparisonFile[] en una transacción.
      await this.repo.create({
        id: comparisonId,
        businessId: business.id,
        userId,
        durationMs: Date.now() - t0,
        status,
        proveedor: conc.proveedor || null,
        etiqueta: par.etiqueta,
        numPairs: 1,
        numPdfs: par.pdfs.length,
        numXlsx: 1,
        numDiscrepancias: conc.totalDiscrepancias,
        geminiInputTokens: inputTokens,
        geminiOutputTokens: outputTokens,
        geminiCostUsd: costeUsd,
        summary: {
          etiqueta: par.etiqueta,
          proveedor: conc.proveedor,
          numeroAlbaran: conc.numeroAlbaran,
          nDiscrepancias: conc.totalDiscrepancias,
          nombreArchivo: nombre,
        },
        files: fileInputs,
      });

      return {
        id: par.id,
        etiqueta: par.etiqueta,
        proveedor: conc.proveedor,
        estado: status === ComparisonStatus.OK ? 'OK' : 'DISCREPANCIAS',
        nDiscrepancias: conc.totalDiscrepancias,
        nombreArchivo: nombre,
        informeBase64: toBase64(informe),
        detalle: {
          numeroAlbaran: conc.numeroAlbaran,
          lineas: conc.lineas,
          lineasCrudas: extracciones.flatMap((r) => r.data.lineas),
        },
      };
    } catch (e) {
      // Persistir errores para que el dashboard de uso refleje los fallos.
      try {
        await this.repo.create({
          businessId: business.id,
          userId,
          durationMs: Date.now() - t0,
          status: ComparisonStatus.ERROR,
          proveedor: null,
          etiqueta: par.etiqueta,
          numPairs: 1,
          numPdfs: par.pdfs.length,
          numXlsx: 1,
          numDiscrepancias: 0,
          geminiInputTokens: 0,
          geminiOutputTokens: 0,
          geminiCostUsd: 0,
          summary: {
            etiqueta: par.etiqueta,
            error: e instanceof Error ? e.message : 'Error desconocido',
          },
          files: [],
        });
      } catch {
        /* best-effort */
      }

      return {
        id: par.id,
        etiqueta: par.etiqueta,
        proveedor: '',
        estado: 'ERROR',
        nDiscrepancias: 0,
        error: e instanceof Error ? e.message : 'Error desconocido',
      };
    }
  }
}
