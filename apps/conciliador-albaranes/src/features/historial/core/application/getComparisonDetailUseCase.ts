/**
 * Use case: obtener el detalle de una comparación con URLs de descarga ya
 * firmadas para cada archivo.
 *
 * Combina dos colaboradores (repo + storage) y aplica una regla de negocio:
 * la URL caduca a los 5 minutos. La presentación NO conoce ni Prisma ni el
 * driver de storage; solo consume `ComparisonDetailWithUrls`.
 */
import type {
  ComparisonDetail,
  ComparisonRepository,
  Scope,
  StorageRepository,
} from '@/shared/core';

const DOWNLOAD_URL_EXPIRY_SEC = 300;

export interface ComparisonDetailWithUrls extends ComparisonDetail {
  files: Array<ComparisonDetail['files'][number] & { downloadUrl: string }>;
}

export class GetComparisonDetailUseCase {
  constructor(
    private readonly repo: ComparisonRepository,
    private readonly storage: StorageRepository,
  ) {}

  async execute(scope: Scope, id: string): Promise<ComparisonDetailWithUrls | null> {
    const detail = await this.repo.findById(scope, id);
    if (!detail) return null;

    const files = await Promise.all(
      detail.files.map(async (f) => ({
        ...f,
        downloadUrl: await this.storage.getDownloadUrl(
          f.storageKey,
          f.filename,
          DOWNLOAD_URL_EXPIRY_SEC,
        ),
      })),
    );
    return { ...detail, files };
  }
}
