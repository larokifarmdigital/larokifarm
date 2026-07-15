// NOTE: storage-first, DB-after — un fallo de DB deja bytes huérfanos; al revés dejaría filas apuntando a bytes que faltan.
import { createId as cuid } from '@paralleldrive/cuid2';
import { ComparisonStatus } from '@prisma/client';
import type {
  ComparisonFileInput,
  ComparisonRepository,
} from '@/core/comparisons';
import {
  buildStorageKey,
  type FileKindKey,
  type StorageRepository,
} from '@/core/storage';
import {
  extractDeliveryNote,
  generateReport,
  mergeDeliveryNotes,
  readOrder,
  reconcile,
  reportFilename,
  type ExtractionResult,
} from '../domain';
import type { PairResult } from './contract';

// NOTE: gemini-2.5-flash prices (USD per 1M tokens).
const GEMINI_PRICE_INPUT_PER_1M_USD = 0.3;
const GEMINI_PRICE_OUTPUT_PER_1M_USD = 2.5;

function computeCostUsd(inputTokens: number, outputTokens: number): number {
  const input = (inputTokens / 1_000_000) * GEMINI_PRICE_INPUT_PER_1M_USD;
  const output = (outputTokens / 1_000_000) * GEMINI_PRICE_OUTPUT_PER_1M_USD;
  return input + output;
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export interface PairInput {
  id: number;
  label: string;
  pdfs: Array<{ filename: string; bytes: Uint8Array }>;
  xlsx: { filename: string; bytes: Uint8Array };
}

export interface ProcessAndPersistPairInput {
  business: { id: string; slug: string };
  userId: string;
  apiKey: string;
  pair: PairInput;
}

export class ProcessAndPersistPairUseCase {
  constructor(
    private readonly repo: ComparisonRepository,
    private readonly storage: StorageRepository,
  ) {}

  async execute(input: ProcessAndPersistPairInput): Promise<PairResult> {
    const { business, userId, apiKey, pair } = input;
    const t0 = Date.now();
    const comparisonId = cuid();
    const createdAt = new Date();

    try {
      const extractions: ExtractionResult[] = await Promise.all(
        pair.pdfs.map(({ bytes }) => extractDeliveryNote(toBase64(bytes), { apiKey })),
      );

      const mergedDeliveryNote = mergeDeliveryNotes(extractions.map((r) => r.data));
      const order = readOrder(pair.xlsx.bytes);
      const reconciliation = reconcile(mergedDeliveryNote, order);
      const reportBytes = generateReport(reconciliation);
      const reportName = reportFilename(reconciliation, order.supplierNumber);

      const inputTokens = extractions.reduce(
        (s: number, r: ExtractionResult) => s + r.usage.promptTokens,
        0,
      );
      const outputTokens = extractions.reduce(
        (s: number, r: ExtractionResult) => s + r.usage.candidatesTokens,
        0,
      );
      const costUsd = computeCostUsd(inputTokens, outputTokens);

      const status: ComparisonStatus = reconciliation.allMatch
        ? ComparisonStatus.OK
        : ComparisonStatus.DISCREPANCIES;

      const files: Array<{
        kind: FileKindKey;
        filename: string;
        bytes: Uint8Array;
        contentType: string;
      }> = [
        ...pair.pdfs.map((p) => ({
          kind: 'PDF_INPUT' as const,
          filename: p.filename,
          bytes: p.bytes,
          contentType: 'application/pdf',
        })),
        {
          kind: 'XLSX_INPUT' as const,
          filename: pair.xlsx.filename,
          bytes: pair.xlsx.bytes,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        {
          kind: 'REPORT_OUTPUT' as const,
          filename: reportName,
          bytes: reportBytes,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ];

      const fileInputs: ComparisonFileInput[] = await Promise.all(
        files.map(async (f) => {
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

      await this.repo.create({
        id: comparisonId,
        businessId: business.id,
        userId,
        durationMs: Date.now() - t0,
        status,
        supplier: reconciliation.supplier || null,
        label: pair.label,
        numPairs: 1,
        numPdfs: pair.pdfs.length,
        numXlsx: 1,
        numDiscrepancies: reconciliation.totalDiscrepancies,
        geminiInputTokens: inputTokens,
        geminiOutputTokens: outputTokens,
        geminiCostUsd: costUsd,
        summary: {
          label: pair.label,
          supplier: reconciliation.supplier,
          deliveryNoteNumber: reconciliation.deliveryNoteNumber,
          numDiscrepancies: reconciliation.totalDiscrepancies,
          reportFilename: reportName,
          // NOTE: guardamos la conciliación completa para renderizar /historial/[id] sin re-parsear el XLSX.
          lines: reconciliation.lines,
        },
        files: fileInputs,
      });

      return {
        id: pair.id,
        label: pair.label,
        supplier: reconciliation.supplier,
        status: status === ComparisonStatus.OK ? 'OK' : 'DISCREPANCIES',
        numDiscrepancies: reconciliation.totalDiscrepancies,
        comparisonId,
        reportFilename: reportName,
        reportBase64: toBase64(reportBytes),
        detail: {
          deliveryNoteNumber: reconciliation.deliveryNoteNumber,
          lines: reconciliation.lines,
          rawLines: extractions.flatMap((r: ExtractionResult) => r.data.lines),
        },
      };
    } catch (e) {
      let persistedId: string | undefined;
      try {
        const errorId = cuid();
        await this.repo.create({
          id: errorId,
          businessId: business.id,
          userId,
          durationMs: Date.now() - t0,
          status: ComparisonStatus.ERROR,
          supplier: null,
          label: pair.label,
          numPairs: 1,
          numPdfs: pair.pdfs.length,
          numXlsx: 1,
          numDiscrepancies: 0,
          geminiInputTokens: 0,
          geminiOutputTokens: 0,
          geminiCostUsd: 0,
          summary: {
            label: pair.label,
            error: e instanceof Error ? e.message : 'Unknown error',
          },
          files: [],
        });
        persistedId = errorId;
      } catch {
        /* best-effort */
      }

      return {
        id: pair.id,
        label: pair.label,
        supplier: '',
        status: 'ERROR',
        numDiscrepancies: 0,
        comparisonId: persistedId,
        error: e instanceof Error ? e.message : 'Unknown error',
      };
    }
  }
}
