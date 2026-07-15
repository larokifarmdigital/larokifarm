import { ForbiddenError, ValidationError, type Role } from '@/core/shared';
import type { Report, ReportRepository } from '../domain';

const MAX_NOTE_LEN = 2000;

export class ResolveReportUseCase {
  constructor(private readonly reports: ReportRepository) {}

  async execute(input: {
    role: Role;
    resolvedById: string;
    reportId: string;
    resolvedNote: string;
  }): Promise<Report> {
    if (input.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Solo el super admin puede resolver reportes.');
    }
    const note = input.resolvedNote.trim();
    if (!note) throw new ValidationError('La nota de resolución es obligatoria.');
    if (note.length > MAX_NOTE_LEN) {
      throw new ValidationError(
        `La nota no puede superar ${MAX_NOTE_LEN} caracteres.`,
      );
    }

    const resolved = await this.reports.resolve({
      reportId: input.reportId,
      resolvedById: input.resolvedById,
      resolvedNote: note,
    });
    if (!resolved) throw new ValidationError('Reporte no encontrado o ya resuelto.');
    return resolved;
  }
}
