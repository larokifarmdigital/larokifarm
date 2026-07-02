import type { Scope } from '@/core/shared';
import type { StorageRepository } from '@/core/storage';
import type { ComparisonDetail, ComparisonRepository } from '../domain';

export interface ComparisonDetailWithUrls extends ComparisonDetail {
  files: Array<ComparisonDetail['files'][number] & { downloadUrl: string }>;
}

export class GetComparisonDetailUseCase {
  constructor(
    private readonly repo: ComparisonRepository,
    private readonly storage: StorageRepository,
  ) {}

  async execute(
    scope: Scope,
    id: string,
  ): Promise<ComparisonDetailWithUrls | null> {
    const detail = await this.repo.findById(scope, id);
    if (!detail) return null;

    const files = await Promise.all(
      detail.files.map(async (f) => ({
        ...f,
        downloadUrl: await this.storage.getDownloadUrl(f.storageKey),
      })),
    );
    return { ...detail, files };
  }
}
