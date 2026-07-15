import type { Scope } from '@/core/shared';
import { ForbiddenError } from '@/core/shared';
import type { ComparisonRepository } from '@/core/comparisons';
import type { Report, ReportRepository } from '../domain';

export class ListReportsByComparisonUseCase {
  constructor(
    private readonly reports: ReportRepository,
    private readonly comparisons: ComparisonRepository,
  ) {}

  async execute(input: {
    scope: Scope;
    comparisonId: string;
  }): Promise<Report[]> {
    const comparison = await this.comparisons.findById(
      input.scope,
      input.comparisonId,
    );
    if (!comparison) throw new ForbiddenError('Comparación no accesible.');
    return this.reports.listByComparison(input.comparisonId);
  }
}
