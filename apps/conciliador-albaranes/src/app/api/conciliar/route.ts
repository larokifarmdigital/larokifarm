import { NextResponse } from 'next/server';
import { auth } from '@/core/auth';
import { getComparisonRepository } from '@/core/comparisons';
import { getBusinessRepository } from '@/core/businesses';
import { getStorage } from '@/core/storage';
import { ProcessAndPersistPairUseCase } from '@/core/engine/application';
import type { PairInput, PairResult } from '@/core/engine';

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

async function pairsFromForm(form: FormData): Promise<PairInput[]> {
  const indices = new Set<number>();
  for (const key of form.keys()) {
    const m = key.match(/^(?:pdfs|xlsx)_(\d+)$/);
    if (m) indices.add(Number(m[1]));
  }

  const pairs: PairInput[] = [];
  for (const i of [...indices].sort((a, b) => a - b)) {
    const label = String(form.get(`label_${i}`) ?? `Par ${i + 1}`);
    const pdfs = form.getAll(`pdfs_${i}`).filter((v): v is File => v instanceof File);
    const xlsx = form.get(`xlsx_${i}`);
    if (pdfs.length === 0 || !(xlsx instanceof File)) {
      pairs.push({ id: i, label, pdfs: [], xlsx: { filename: '', bytes: new Uint8Array() } });
      continue;
    }
    const pdfBytes = await Promise.all(
      pdfs.map(async (pdf) => ({
        filename: pdf.name,
        bytes: new Uint8Array(await pdf.arrayBuffer()),
      })),
    );
    pairs.push({
      id: i,
      label,
      pdfs: pdfBytes,
      xlsx: { filename: xlsx.name, bytes: new Uint8Array(await xlsx.arrayBuffer()) },
    });
  }
  return pairs;
}

export async function POST(req: Request) {
  const ctxResult = await resolveContext();
  if (!ctxResult.ok) return ctxResult.response;
  const { ctx } = ctxResult;

  const form = await req.formData();
  const pairs = await pairsFromForm(form);

  const useCase = new ProcessAndPersistPairUseCase(
    getComparisonRepository(),
    getStorage(),
  );

  const tasks: Array<Promise<PairResult>> = pairs.map((pair) => {
    if (pair.pdfs.length === 0) {
      return Promise.resolve<PairResult>({
        id: pair.id,
        label: pair.label,
        supplier: '',
        status: 'ERROR',
        numDiscrepancies: 0,
        error: 'Faltan archivos del par (al menos 1 PDF + 1 Excel).',
      });
    }
    return useCase.execute({
      business: ctx.business,
      userId: ctx.userId,
      apiKey: ctx.apiKey,
      pair,
    });
  });

  const summary = await Promise.all(tasks);
  return NextResponse.json({ summary });
}
