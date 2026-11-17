import type { ReportRepository } from '../domain';
import { ReportRepositoryPrisma } from './ReportRepositoryPrisma';

let cached: ReportRepository | null = null;

export function getReportRepository(): ReportRepository {
  if (!cached) cached = new ReportRepositoryPrisma();
  return cached;
}
