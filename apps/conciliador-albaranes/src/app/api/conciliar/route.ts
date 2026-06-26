/**
 * POST /api/conciliar
 *
 * Thin handler: solo se ocupa del transporte HTTP y la autorización.
 * Toda la lógica está en `ProcesarYPersistirParUseCase` del feature `conciliador`.
 *
 *   1. Verifica sesión (Auth.js).
 *   2. Resuelve negocio del usuario (Fase 4 SUPER_ADMIN podrá elegir).
 *   3. Resuelve la API key de Gemini (BYOK del negocio o global como fallback).
 *   4. Para cada par del form, invoca el use case.
 *   5. Devuelve `{ resumen: ResultadoPar[] }`.
 */
import { NextResponse } from 'next/server';
import { auth } from '@/features/auth';
import {
  getBusinessRepository,
  getComparisonRepository,
  getStorage,
} from '@/shared/core';
import {
  ProcesarYPersistirParUseCase,
  type ParInput,
  type ResultadoPar,
} from '@/features/conciliador';

export const runtime = 'nodejs';

interface ResolvedContext {
  business: { id: string; slug: string };
  userId: string;
  apiKey: string;
}

async function resolveContext(): Promise<
  | { ok: true; ctx: ResolvedContext }
  | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    };
  }

  if (!session.user.businessId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'El usuario no tiene un negocio asignado.' },
        { status: 403 },
      ),
    };
  }

  const businessRepo = getBusinessRepository();
  const business = await businessRepo.findById(session.user.businessId);
  if (!business) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 }),
    };
  }

  let apiKey: string | null | undefined;
  if (business.hasGeminiKey) {
    try {
      apiKey = await businessRepo.getDecryptedGeminiKey(business.id);
    } catch {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'No se pudo descifrar la API key del negocio.' },
          { status: 500 },
        ),
      };
    }
  }
  if (!apiKey) {
    apiKey = process.env.GEMINI_API_KEY;
  }
  if (!apiKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'No hay GEMINI_API_KEY configurada (ni en el negocio ni global).' },
        { status: 500 },
      ),
    };
  }

  return {
    ok: true,
    ctx: {
      business: { id: business.id, slug: business.slug },
      userId: session.user.id,
      apiKey,
    },
  };
}

async function paresDelForm(form: FormData): Promise<ParInput[]> {
  const indices = new Set<number>();
  for (const key of form.keys()) {
    const m = key.match(/^(?:pdfs|xlsx)_(\d+)$/);
    if (m) indices.add(Number(m[1]));
  }

  const pares: ParInput[] = [];
  for (const i of [...indices].sort((a, b) => a - b)) {
    const etiqueta = String(form.get(`label_${i}`) ?? `Par ${i + 1}`);
    const pdfs = form.getAll(`pdfs_${i}`).filter((v): v is File => v instanceof File);
    const xlsx = form.get(`xlsx_${i}`);
    if (pdfs.length === 0 || !(xlsx instanceof File)) {
      pares.push({ id: i, etiqueta, pdfs: [], xlsx: { filename: '', bytes: new Uint8Array() } });
      continue;
    }
    const pdfBytes = await Promise.all(
      pdfs.map(async (pdf) => ({
        filename: pdf.name,
        bytes: new Uint8Array(await pdf.arrayBuffer()),
      })),
    );
    pares.push({
      id: i,
      etiqueta,
      pdfs: pdfBytes,
      xlsx: { filename: xlsx.name, bytes: new Uint8Array(await xlsx.arrayBuffer()) },
    });
  }
  return pares;
}

export async function POST(req: Request) {
  const ctxResult = await resolveContext();
  if (!ctxResult.ok) return ctxResult.response;
  const { ctx } = ctxResult;

  const form = await req.formData();
  const pares = await paresDelForm(form);

  const useCase = new ProcesarYPersistirParUseCase(
    getComparisonRepository(),
    getStorage(),
  );

  const tareas: Array<Promise<ResultadoPar>> = pares.map((par) => {
    if (par.pdfs.length === 0) {
      return Promise.resolve<ResultadoPar>({
        id: par.id,
        etiqueta: par.etiqueta,
        proveedor: '',
        estado: 'ERROR',
        nDiscrepancias: 0,
        error: 'Faltan archivos del par (al menos 1 PDF + 1 Excel).',
      });
    }
    return useCase.execute({
      business: ctx.business,
      userId: ctx.userId,
      apiKey: ctx.apiKey,
      par,
    });
  });

  const resumen = await Promise.all(tareas);
  return NextResponse.json({ resumen });
}
