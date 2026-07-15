import type { Scope } from '@/core/shared';
import { ForbiddenError, ValidationError } from '@/core/shared';
import type { ComparisonRepository } from '@/core/comparisons';
import type { Report, ReportRepository } from '../domain';

const MAX_NOTE_LEN = 2000;

export class CreateReportUseCase {
  constructor(
    private readonly reports: ReportRepository,
    private readonly comparisons: ComparisonRepository,
  ) {}

  async execute(input: {
    scope: Scope;
    userId: string;
    comparisonId: string;
    note: string;
  }): Promise<Report> {
    const note = input.note.trim();
    if (!note) throw new ValidationError('La nota del reporte es obligatoria.');
    if (note.length > MAX_NOTE_LEN) {
      throw new ValidationError(
        `La nota no puede superar ${MAX_NOTE_LEN} caracteres.`,
      );
    }

    // NOTE: reusamos scope de la comparación para gate de acceso — si el user
    // no puede ver la comparación, tampoco puede reportar sobre ella.
    const comparison = await this.comparisons.findById(
      input.scope,
      input.comparisonId,
    );
    if (!comparison) throw new ForbiddenError('Comparación no accesible.');

    return this.reports.create({
      comparisonId: input.comparisonId,
      userId: input.userId,
      note,
    });
  }
}
