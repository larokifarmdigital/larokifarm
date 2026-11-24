import { NextResponse } from 'next/server';
import { auth, farmaciasActualesDe, puedeUsarModulo } from '@/core/auth';
import {
  GetBudgetStatusUseCase,
  getAiUsageRepository, getComparisonRepository,
} from '@/core/comparisons';
import { getBusinessRepository } from '@/core/businesses';
import { getStorage } from '@/core/storage';
import { ProcessAndPersistPairUseCase } from '@/core/engine/application';
import type { PairInput, PairResult } from '@/core/engine';

export const runtime = 'nodejs';
// Gemini tarda ~1 min por par; en Vercel el máximo con Fluid Compute es 300 s.
export const maxDuration = 300;

interface ResolvedContext {
  business: { id: string; slug: string };
  userId: string;
  apiKey: string;
  esAdmin: boolean;
}

/**
 * Farmacia para la que se concilia: `?farmacia=<id>` (obligatoria si el
 * usuario lleva varias). La pertenencia se comprueba contra la BD, no contra
 * el JWT: el presupuesto y la clave de Gemini son los de ESA farmacia.
 */
async function resolveContext(req: Request): Promise<
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
  if (!(await puedeUsarModulo(session.user.id, 'conciliador'))) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No tienes activado el conciliador de albaranes.' }, { status: 403 }),
    };
  }

  const esAdmin = session.user.role === 'SUPER_ADMIN';
  const pedida = new URL(req.url).searchParams.get('farmacia')?.trim() || null;
  let businessId: string | null;
  if (esAdmin) {
    businessId = pedida ?? session.user.businessId;
  } else {
    const mias = await farmaciasActualesDe(session.user.id);
    if (mias.length === 0) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'El usuario no tiene un negocio asignado.' }, { status: 403 }),
      };
    }
    if (pedida && !mias.includes(pedida)) {
      return { ok: false, response: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) };
    }
    if (!pedida && mias.length > 1) {
      return {
        ok: false,
        response: NextResponse.json({ error: 'Elige para qué farmacia es la conciliación.' }, { status: 400 }),
      };
    }
    businessId = pedida ?? mias[0];
  }
  if (!businessId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'El usuario no tiene un negocio asignado.' },
        { status: 403 },
      ),
    };
  }

  const businessRepo = getBusinessRepository();
  const business = await businessRepo.findById(businessId);
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
      esAdmin,
    },
  };
}

async function pairsFromForm(form: FormData): Promise<PairInput[]> {
  const indices = new Set<number>();
  for (const key of form.keys()) {
    // NOTE: `xlsxs` plural (multi-Excel). Mantener compat con `xlsx` singular por si
    // llega un cliente antiguo todavía en producción.
    const m = key.match(/^(?:pdfs|xlsxs?)_(\d+)$/);
    if (m) indices.add(Number(m[1]));
  }

  const pairs: PairInput[] = [];
  for (const i of [...indices].sort((a, b) => a - b)) {
    const label = String(form.get(`label_${i}`) ?? `Par ${i + 1}`);
    const pdfs = form.getAll(`pdfs_${i}`).filter((v): v is File => v instanceof File);
    const xlsxs = form.getAll(`xlsxs_${i}`).filter((v): v is File => v instanceof File);
    // NOTE: fallback a la clave singular `xlsx_${i}` por compat con clientes antiguos.
    const legacyXlsx = form.get(`xlsx_${i}`);
    if (xlsxs.length === 0 && legacyXlsx instanceof File) xlsxs.push(legacyXlsx);

    if (pdfs.length === 0 || xlsxs.length === 0) {
      pairs.push({ id: i, label, pdfs: [], xlsxs: [] });
      continue;
    }
    const pdfBytes = await Promise.all(
      pdfs.map(async (pdf) => ({
        filename: pdf.name,
        bytes: new Uint8Array(await pdf.arrayBuffer()),
      })),
    );
    const xlsxBytes = await Promise.all(
      xlsxs.map(async (x) => ({
        filename: x.name,
        bytes: new Uint8Array(await x.arrayBuffer()),
      })),
    );
    pairs.push({ id: i, label, pdfs: pdfBytes, xlsxs: xlsxBytes });
  }
  return pairs;
}

export async function POST(req: Request) {
  const ctxResult = await resolveContext(req);
  if (!ctxResult.ok) return ctxResult.response;
  const { ctx } = ctxResult;

  // NOTE: hard-block cuando el gasto del mes ya supera el budget del negocio. 402 = Payment Required, semánticamente correcto.
  const budgetStatus = await new GetBudgetStatusUseCase(
    getBusinessRepository(),
    getComparisonRepository(),
    getAiUsageRepository(),
  ).execute(ctx.business.id);
  if (budgetStatus.level === 'blocked') {
    return NextResponse.json(
      {
        error: 'Se alcanzó el límite de uso permitido este mes.',
        budgetBlocked: true,
        supportEmail: budgetStatus.supportEmail,
        spentUsd: budgetStatus.spentUsd,
        budgetUsd: budgetStatus.budgetUsd,
      },
      { status: 402 },
    );
  }

  const form = await req.formData();
  const pairs = await pairsFromForm(form);

  const useCase = new ProcessAndPersistPairUseCase(
    getComparisonRepository(),
    getStorage(),
  );

  const tasks: Array<Promise<PairResult>> = pairs.map((pair) => {
    if (pair.pdfs.length === 0 || pair.xlsxs.length === 0) {
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
  // La lectura en bruto de la IA (rawLines) es una herramienta de depuración:
  // solo viaja al navegador del SUPER_ADMIN (antes llegaba a todos los roles).
  const respuesta = ctx.esAdmin
    ? summary
    : summary.map((r) => (r.detail ? { ...r, detail: { ...r.detail, rawLines: undefined } } : r));
  return NextResponse.json({ summary: respuesta });
}
