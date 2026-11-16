import type { SaveResult } from '@/core/shared';
import type { StorageRepository } from '@/core/storage';
import type { FarmaciaRepository } from '../domain';

/**
 * Elimina una farmacia definitivamente (el repo valida permisos y que esté
 * archivada y sin datos del conciliador) y después borra sus archivos de R2.
 * El storage es best-effort: si un archivo falla, la farmacia ya no existe y
 * el archivo queda huérfano (se registra, no se reintenta).
 */
export class DeleteFarmaciaUseCase {
  constructor(
    private readonly repo: FarmaciaRepository,
    private readonly storage: StorageRepository,
  ) {}

  async execute(id: string): Promise<SaveResult<{ archivosBorrados: number }>> {
    if (typeof id !== 'string' || !id) return { ok: false, error: 'Farmacia inválida' };
    const res = await this.repo.deleteFarmacia(id);
    if (!res.ok) return res;
    let archivosBorrados = 0;
    for (const key of res.data.storageKeys) {
      try {
        await this.storage.delete(key);
        archivosBorrados++;
      } catch (e) {
        console.warn('[farmacias] no se pudo borrar del storage', key, e instanceof Error ? e.message : e);
      }
    }
    return { ok: true, data: { archivosBorrados } };
  }
}
