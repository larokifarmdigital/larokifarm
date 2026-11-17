import { NextResponse } from 'next/server';
import { auth } from '@/core/auth';
import { ForbiddenError, ValidationError } from '@/core/shared';
import {
  ResolveReportUseCase,
  getReportRepository,
} from '@/core/reports';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const resolvedNote = typeof body?.resolvedNote === 'string' ? body.resolvedNote : '';

  const useCase = new ResolveReportUseCase(getReportRepository());
  try {
    const report = await useCase.execute({
      role: session.user.role,
      resolvedById: session.user.id,
      reportId: id,
      resolvedNote,
    });
    return NextResponse.json({ report });
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
