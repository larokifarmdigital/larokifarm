import { NextResponse } from 'next/server';
import { auth } from '@/core/auth';
import { scopeFromSession, ForbiddenError, ValidationError } from '@/core/shared';
import { getComparisonRepository } from '@/core/comparisons';
import {
  CreateReportUseCase,
  ListReportsByComparisonUseCase,
  getReportRepository,
} from '@/core/reports';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const { id } = await params;
  const useCase = new ListReportsByComparisonUseCase(
    getReportRepository(),
    getComparisonRepository(),
  );
  try {
    const reports = await useCase.execute({
      scope: scopeFromSession(session),
      comparisonId: id,
    });
    return NextResponse.json({ reports });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const note = typeof body?.note === 'string' ? body.note : '';

  const useCase = new CreateReportUseCase(
    getReportRepository(),
    getComparisonRepository(),
  );
  try {
    const report = await useCase.execute({
      scope: scopeFromSession(session),
      userId: session.user.id,
      comparisonId: id,
      note,
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    throw err;
  }
}
