import type { ReportStatus } from '@prisma/client';

export { type ReportStatus };

export interface ReportAuthor {
  id: string;
  name: string;
  email: string;
}

export interface Report {
  id: string;
  comparisonId: string;
  note: string;
  status: ReportStatus;
  createdAt: Date;
  author: ReportAuthor;
  resolvedNote: string | null;
  resolvedAt: Date | null;
  resolvedBy: ReportAuthor | null;
}
